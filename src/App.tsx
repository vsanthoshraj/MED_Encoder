import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Card,
  TextField,
  CircularProgress,
  ThemeProvider,
  CssBaseline,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider
} from '@mui/material';
import {
  Lock,
  Unlock,
  ArrowLeft,
  Upload,
  CheckCircle,
  XCircle,
  Share2,
  Camera as CameraIcon,
  Library,
  Trash2,
  FileText,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from './theme';
import { medEngine } from './lib/medEngine';

type AppState = 'home' | 'encode_input' | 'decode_input' | 'text_encode' | 'text_decode' | 'success' | 'error';


function App() {
  const [state, setState] = useState<AppState>('home');
  const [files, setFiles] = useState<File[]>([]);
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [resultText, setResultText] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [encodedValue, setEncodedValue] = useState('');
  const [libraryFiles, setLibraryFiles] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [copied, setCopied] = useState(false);


  const loadLibrary = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents,
      });
      const pdfs = result.files
        .map(f => f.name)
        .filter(name => name.endsWith('.pdf') && name.includes('MED_Encoded'))
        .sort((a, b) => b.localeCompare(a)); // Newest first (by timestamp in name)
      setLibraryFiles(pdfs);
    } catch (err) {
      console.error('Failed to read library', err);
    }
  };

  const handleOpenLibrary = () => {
    loadLibrary();
    setShowLibrary(true);
  };

  const selectFromLibrary = async (fileName: string) => {
    try {
      setLoading(true);
      const res = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents
      });
      // Convert base64 to File object
      const blob = await fetch(`data:application/pdf;base64,${res.data}`).then(r => r.blob());
      const selectedFile = new File([blob], fileName, { type: 'application/pdf' });
      setFiles([selectedFile]);
      setShowLibrary(false);
    } catch (err) {
      console.error('Library selection failed', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFromLibrary = async (fileName: string) => {
    try {
      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Documents
      });
      loadLibrary();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };



  const handleCamera = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64
      });

      if (image.base64String) {
        // Convert base64 string to a File-like object for medEngine
        const byteCharacters = atob(image.base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const camFile = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFiles(prev => [...prev, camFile]);
      }
    } catch (err) {
      console.error('Camera failed', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (state === 'decode_input') {
        setFiles([selectedFiles[0]]); // Decode only one PDF at a time
      } else {
        setFiles(prev => [...prev, ...selectedFiles]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEncode = async () => {
    if (files.length === 0 || !secret) return;
    setLoading(true);
    try {
      const pdfBytes = await medEngine.encode(files, secret);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const finalName = `MED_Encoded_${Date.now()}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // Mobile Implementation: Save to local Filesystem
        const base64Data = btoa(
          pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const result = await Filesystem.writeFile({
          path: finalName,
          data: base64Data,
          directory: Directory.Documents,
        });

        console.log('File saved at:', result.uri);
        setErrorMsg(`Saved to: Internal Storage > Documents > ${finalName}`);
      } else {
        // Web Implementation: Standard Download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = finalName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 2000);
        setErrorMsg(`Saved as: ${finalName}`);
      }

      setState('success');
    } catch (err: any) {
      console.error(err);
      setState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const finalName = errorMsg.split('>').pop()?.trim() || 'MED_File.pdf';
        const fileResult = await Filesystem.getUri({
          directory: Directory.Documents,
          path: finalName
        });

        await Share.share({
          title: 'Share Encoded MED PDF',
          text: 'Sending secure file',
          url: fileResult.uri,
          dialogTitle: 'Share with',
        });
      } catch (err) {
        console.error('Sharing failed', err);
      }
    }
  };

  const handleDecode = async () => {
    if (files.length === 0 || !secret) return;
    setLoading(true);
    try {
      const buffer = await files[0].arrayBuffer();
      const base64Array = await medEngine.decode(buffer, secret);
      setResultImages(base64Array);
      setState('success');
    } catch (err: any) {
      setState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTextEncode = () => {

    if (!inputText || !secret) return;
    try {
      const encoded = medEngine.textEncode(inputText, secret);
      setEncodedValue(encoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleTextDecode = () => {
    if (!encodedValue || !secret) return;
    try {
      const decoded = medEngine.textDecode(encodedValue, secret);
      setResultText(decoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(encodedValue || resultText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const reset = () => {
    setState('home');
    setFiles([]);
    setSecret('');
    setConfirmSecret('');
    setResultImages([]);
    setResultText(null);
    setInputText('');
    setEncodedValue('');
  };


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          bgcolor: 'background.default',
          color: 'text.primary',
          pt: 8,
          pb: 4
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -1, mb: 1 }}>
                MED ENCODER
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Secure Offline Image Archiving
              </Typography>
            </motion.div>
          </Box>

          <AnimatePresence mode="wait">
            {state === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Stack spacing={3}>
                  <Card
                    sx={{ p: 4, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }}
                    onClick={() => setState('encode_input')}
                  >
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: 3, color: 'background.default' }}>
                        <Lock size={32} />
                      </Box>
                      <Box>
                        <Typography variant="h5">Encode Image</Typography>
                        <Typography variant="body2" color="text.secondary">Convert image to secure PDF</Typography>
                      </Box>
                    </Stack>
                  </Card>

                  <Card
                    sx={{ p: 4, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }}
                    onClick={() => setState('decode_input')}
                  >
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box sx={{ p: 2, bgcolor: 'secondary.main', borderRadius: 3, color: 'background.default' }}>
                        <Unlock size={32} />
                      </Box>
                      <Box>
                        <Typography variant="h5">Decode PDF</Typography>
                        <Typography variant="body2" color="text.secondary">Extract image from MED PDF</Typography>
                      </Box>
                    </Stack>
                  </Card>

                  <Card
                    sx={{ p: 4, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }}
                    onClick={() => setState('text_encode')}
                  >
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box sx={{ p: 2, bgcolor: 'info.main', borderRadius: 3, color: 'background.default' }}>
                        <MessageSquare size={32} />
                      </Box>
                      <Box>
                        <Typography variant="h5">Chat Encoder</Typography>
                        <Typography variant="body2" color="text.secondary">Securely encode text messages</Typography>
                      </Box>
                    </Stack>
                  </Card>

                  <Card
                    sx={{ p: 4, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }}
                    onClick={() => setState('text_decode')}
                  >
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box sx={{ p: 2, bgcolor: 'warning.main', borderRadius: 3, color: 'background.default' }}>
                        <MessageSquare size={32} />
                      </Box>
                      <Box>
                        <Typography variant="h5">Chat Decoder</Typography>
                        <Typography variant="body2" color="text.secondary">Decode secure text messages</Typography>
                      </Box>
                    </Stack>
                  </Card>

                </Stack>
              </motion.div>
            )}

            {(state === 'encode_input' || state === 'decode_input') && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Stack spacing={4}>
                  <Button
                    startIcon={<ArrowLeft size={18} />}
                    onClick={reset}
                    sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
                  >
                    Back
                  </Button>

                  <Typography variant="h5">
                    {state === 'encode_input' ? 'Encode New Image' : 'Decode MED PDF'}
                  </Typography>

                  <Box sx={{ p: 4, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 4, textAlign: 'center' }}>
                    <input
                      type="file"
                      multiple
                      accept={state === 'encode_input' ? "image/*" : ".pdf"}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Stack spacing={2} alignItems="center" sx={{ cursor: 'pointer' }}>
                        <Upload size={48} color={files.length > 0 ? "#D0BCFF" : "rgba(255,255,255,0.3)"} />
                        <Typography variant="body1" color={files.length > 0 ? "text.primary" : "text.secondary"}>
                          {files.length > 0 ? `${files.length} File(s) selected` : (state === 'encode_input' ? 'Drop Image(s) Here' : 'Drop Encoded PDF Here')}
                        </Typography>
                        <Button component="span" variant="outlined">{files.length > 0 ? 'Add More Files' : 'Select File'}</Button>
                        {state === 'encode_input' && (
                          <Button
                            variant="contained"
                            startIcon={<CameraIcon size={20} />}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCamera();
                            }}
                          >
                            Add Camera Photo
                          </Button>
                        )}
                        {files.length > 0 && state === 'encode_input' && (
                          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 2 }}>
                            {files.map((file, i) => (
                              <Paper key={i} sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <Typography variant="caption">{file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}</Typography>
                                <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(i); }}>
                                  <Trash2 size={14} color="#f44336" />
                                </IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                        {state === 'decode_input' && Capacitor.isNativePlatform() && (
                          <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<Library size={20} />}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenLibrary();
                            }}
                          >
                            MED Library
                          </Button>
                        )}
                      </Stack>
                    </label>
                  </Box>

                  <TextField
                    label="Secret Text Verification"
                    variant="filled"
                    fullWidth
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter secret key..."
                  />

                  {state === 'encode_input' && (
                    <TextField
                      label="Confirm Secret Text"
                      variant="filled"
                      fullWidth
                      type="password"
                      error={secret !== '' && confirmSecret !== '' && secret !== confirmSecret}
                      helperText={secret !== '' && confirmSecret !== '' && secret !== confirmSecret ? "Codes do not match" : ""}
                      value={confirmSecret}
                      onChange={(e) => setConfirmSecret(e.target.value)}
                      placeholder="Re-enter secret key..."
                    />
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={files.length === 0 || !secret || (state === 'encode_input' && secret !== confirmSecret) || loading}
                    onClick={state === 'encode_input' ? handleEncode : handleDecode}
                  >
                    {loading ? <CircularProgress size={24} /> : (state === 'encode_input' ? `Generate PDF (${files.length} Images)` : 'Decode Images')}
                  </Button>
                </Stack>
              </motion.div>
            )}

            {(state === 'text_encode' || state === 'text_decode') && (
              <motion.div
                key="text_input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Stack spacing={4}>
                  <Button
                    startIcon={<ArrowLeft size={18} />}
                    onClick={reset}
                    sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
                  >
                    Back
                  </Button>

                  <Typography variant="h5">
                    {state === 'text_encode' ? 'Chat Text Encoder' : 'Chat Text Decoder'}
                  </Typography>

                  {state === 'text_encode' ? (
                    <TextField
                      label="Message to Encode"
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={4}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your secret message here..."
                    />
                  ) : (
                    <TextField
                      label="Encoded Value"
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={4}
                      value={encodedValue}
                      onChange={(e) => setEncodedValue(e.target.value)}
                      placeholder="Paste the encoded text here..."
                    />
                  )}

                  <TextField
                    label="Secret Code"
                    variant="filled"
                    fullWidth
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter secret code..."
                  />

                  {state === 'text_encode' && (
                    <TextField
                      label="Confirm Secret Code"
                      variant="filled"
                      fullWidth
                      type="password"
                      error={secret !== '' && confirmSecret !== '' && secret !== confirmSecret}
                      helperText={secret !== '' && confirmSecret !== '' && secret !== confirmSecret ? "Codes do not match" : ""}
                      value={confirmSecret}
                      onChange={(e) => setConfirmSecret(e.target.value)}
                      placeholder="Re-enter secret code..."
                    />
                  )}

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={(state === 'text_encode' ? !inputText : !encodedValue) || !secret || (state === 'text_encode' && secret !== confirmSecret) || loading}
                    onClick={state === 'text_encode' ? handleTextEncode : handleTextDecode}
                  >
                    {state === 'text_encode' ? 'Encode Text' : 'Decode Text'}
                  </Button>
                </Stack>
              </motion.div>
            )}


            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ width: '100%' }}
              >
                <Stack spacing={(resultImages.length > 0 || resultText || encodedValue) ? 2 : 4} alignItems="center" sx={{ textAlign: 'center', width: '100%' }}>
                  {!resultImages.length && !resultText && !encodedValue && <CheckCircle size={80} color="#4CAF50" />}

                  {!resultImages.length && !resultText && !encodedValue && (
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Operation Successful!
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {errorMsg}
                      </Typography>
                    </Box>
                  )}

                  {!resultImages.length && !resultText && !encodedValue && Capacitor.isNativePlatform() && (

                    <Button
                      startIcon={<Share2 size={20} />}
                      variant="outlined"
                      onClick={handleShare}
                      fullWidth
                    >
                      Share Secure PDF
                    </Button>
                  )}

                  {resultImages.length > 0 && (
                    <Stack spacing={2} sx={{ width: '100%' }}>
                      <Typography variant="h6">Decoded {resultImages.length} Image(s)</Typography>
                      <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: 2,
                        width: '100%',
                        maxHeight: '60vh',
                        overflow: 'auto',
                        p: 1
                      }}>
                        {resultImages.map((img, idx) => (
                          <Paper
                            key={idx}
                            elevation={0}
                            sx={{
                              overflow: 'hidden',
                              borderRadius: 2,
                              bgcolor: 'rgba(255,255,255,0.05)',
                              p: 1,
                              '& img': {
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                borderRadius: 1
                              }
                            }}
                          >
                            <img src={img} alt={`Decoded ${idx}`} />
                          </Paper>
                        ))}
                      </Box>
                    </Stack>
                  )}

                  {resultText && (
                    <Box sx={{ width: '100%' }}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          textAlign: 'left',
                          position: 'relative',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                          {resultText}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                          onClick={handleCopy}
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        >
                          {copied ? 'Copied' : 'Copy Text'}
                        </Button>
                      </Paper>
                    </Box>
                  )}

                  {encodedValue && state === 'success' && !resultText && resultImages.length === 0 && (
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="h6" gutterBottom>Text Encoded!</Typography>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          textAlign: 'left',
                          position: 'relative',
                          border: '1px solid rgba(255,255,255,0.1)',
                          mb: 2
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            color: 'text.secondary',
                            mb: 2,
                            maxHeight: '100px',
                            overflow: 'auto'
                          }}
                        >
                          {encodedValue}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
                          onClick={handleCopy}
                          variant="contained"
                          sx={{ borderRadius: 2 }}
                        >
                          {copied ? 'Copied' : 'Copy Encoded Value'}
                        </Button>
                      </Paper>
                    </Box>
                  )}

                  <Button variant="contained" fullWidth sx={{ mt: (resultImages.length > 0 || resultText || encodedValue) ? 2 : 0 }} onClick={reset}>Done</Button>

                </Stack>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Stack spacing={4} alignItems="center" sx={{ textAlign: 'center' }}>
                  <XCircle size={80} color="#F44336" />
                  <Typography variant="h6" color="error">Operation Failed</Typography>
                  <Button variant="contained" fullWidth onClick={reset}>Try Again</Button>
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>

        {/* MED Library Dialog */}
        <Dialog
          open={showLibrary}
          onClose={() => setShowLibrary(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: { borderRadius: 4, bgcolor: 'background.paper' }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Library size={24} /> MED Library
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {libraryFiles.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="body2">No encoded files found in Documents.</Typography>
              </Box>
            ) : (
              <List sx={{ pt: 0 }}>
                {libraryFiles.map((fileName, index) => (
                  <React.Fragment key={fileName}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={() => deleteFromLibrary(fileName)}>
                          <Trash2 size={18} />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton onClick={() => selectFromLibrary(fileName)}>
                        <ListItemIcon>
                          <FileText color="#D0BCFF" />
                        </ListItemIcon>
                        <ListItemText
                          primary={fileName.replace('MED_Encoded_', '').replace('.pdf', '')}
                          secondary="MED PDF Document"
                          primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 500 } }}
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < libraryFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <Box sx={{ p: 2 }}>
            <Button fullWidth onClick={() => setShowLibrary(false)}>Cancel</Button>
          </Box>
        </Dialog>
      </Box>
    </ThemeProvider >
  );
}

export default App;
