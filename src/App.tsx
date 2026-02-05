import React, { useState, useRef, useEffect } from 'react';
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
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Unlock,
  ArrowLeft,
  Upload,
  CheckCircle,
  XCircle,
  Camera as CameraIcon,
  Library,
  Trash2,
  FileText,
  MessageSquare,
  Copy,
  Check,
  Settings,
  Github,
  Eye,
  EyeOff,
  X,
  Folder,
  Shield
} from 'lucide-react';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';
import { App as AppCap } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from './theme';
import { medEngine } from './lib/medEngine';
import type { DecodedFile } from './lib/medEngine';

type AppState = 'home' | 'encode_input' | 'decode_input' | 'text_encode' | 'text_decode' | 'success' | 'error' | 'about' | 'locked';


function App() {
  const [state, setState] = useState<AppState>('home');
  const [files, setFiles] = useState<File[]>([]);
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultFiles, setResultFiles] = useState<any[]>([]);
  const [resultText, setResultText] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [encodedValue, setEncodedValue] = useState('');
  const [libraryFiles, setLibraryFiles] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [customFileName, setCustomFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'image' | 'file' | 'text'>('image');
  const [showPassword, setShowPassword] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [vaultPath, setVaultPath] = useState(localStorage.getItem('med_vault_path') || 'MED/Encrypted');
  const [appPasscode, setAppPasscode] = useState(localStorage.getItem('med_app_passcode') || '');
  const [enteredPin, setEnteredPin] = useState('');
  const clipboardTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleReLock = () => {
      const savedPasscode = localStorage.getItem('med_app_passcode');
      if (savedPasscode) {
        setAppPasscode(savedPasscode);
        setState('locked');
        setEnteredPin('');
      }
    };

    handleReLock();

    let appStateListener: any;
    if (Capacitor.isNativePlatform()) {
      appStateListener = AppCap.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          handleReLock();
        }
      });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (appStateListener) appStateListener.then((l: any) => l.remove());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleUnlock = (digit: string) => {
    const newPin = enteredPin + digit;
    if (newPin.length <= 4) {
      setEnteredPin(newPin);
      if (newPin.length === 4) {
        const saved = localStorage.getItem('med_app_passcode');
        if (newPin === saved || newPin === appPasscode) {
          setState('home');
          setEnteredPin('');
        } else {
          setErrorMsg('Wrong Passcode');
          setTimeout(() => {
            setEnteredPin('');
            setErrorMsg('');
          }, 600);
        }
      }
    }
  };

  const updatePasscode = (newPin: string) => {
    setAppPasscode(newPin);
    if (newPin.length === 4) {
      localStorage.setItem('med_app_passcode', newPin);
      setState('locked');
      setEnteredPin('');
    } else if (newPin === '') {
      localStorage.removeItem('med_app_passcode');
    }
  };

  const updateVaultPath = (newPath: string) => {
    setVaultPath(newPath);
    localStorage.setItem('med_vault_path', newPath);
  };


  const loadLibrary = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await Filesystem.readdir({
        path: vaultPath,
        directory: Directory.Documents,
      });
      const pdfs = result.files
        .map(f => f.name)
        .filter(name => name.endsWith('.pdf'))
        .sort((a, b) => b.localeCompare(a));
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
        path: `${vaultPath}/${fileName}`,
        directory: Directory.Documents
      });
      const dataStr = typeof res.data === 'string' ? res.data : '';
      const blob = await fetch(`data:application/pdf;base64,${dataStr}`).then(r => r.blob());
      const selectedFile = new File([blob], fileName, { type: 'application/pdf' });
      setFiles([selectedFile]);
      setShowLibrary(false);
      setMode('image');
      setState('decode_input');
    } catch (err) {
      console.error('Library selection failed', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFromLibrary = async (fileName: string) => {
    try {
      await Filesystem.deleteFile({
        path: `${vaultPath}/${fileName}`,
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
        setFiles([selectedFiles[0]]);
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
      const namePrefix = customFileName.trim() || 'Archive';
      const finalName = `${namePrefix}_${Date.now()}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = btoa(pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
        await Filesystem.writeFile({
          path: `${vaultPath}/${finalName}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        setErrorMsg(`Vault: Documents/${vaultPath}/${finalName}`);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = finalName;
        a.click();
        setErrorMsg(`Downloaded: ${finalName}`);
      }
      setState('success');
    } catch (err) {
      setState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (files.length === 0 || !secret) return;
    setLoading(true);
    try {
      const buffer = await files[0].arrayBuffer();
      const decodedFiles = await medEngine.decode(buffer, secret);
      setResultFiles(decodedFiles);
      setState('success');
    } catch (err) {
      setState('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTextEncode = async () => {
    if (!inputText || !secret) return;
    try {
      const encoded = await medEngine.textEncode(inputText, secret);
      setEncodedValue(encoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleTextDecode = async () => {
    if (!encodedValue || !secret) return;
    try {
      const decoded = await medEngine.textDecode(encodedValue, secret);
      setResultText(decoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleDownload = async (file: DecodedFile) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = file.data.split(',')[1];
        await Filesystem.writeFile({
          path: `MED/Decrypted/${file.name}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        alert(`Saved to: Documents/MED/Decrypted/${file.name}`);
      } catch (err) {
        console.error('Save failed', err);
      }
    } else {
      const a = document.createElement('a');
      a.href = file.data;
      a.download = file.name;
      a.click();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(encodedValue || resultText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (clipboardTimeoutRef.current) clearTimeout(clipboardTimeoutRef.current);
    clipboardTimeoutRef.current = setTimeout(() => {
      navigator.clipboard.writeText('');
    }, 60000);
  };

  const reset = () => {
    setState('home');
    setFiles([]);
    setSecret('');
    setConfirmSecret('');
    setResultFiles([]);
    setResultText(null);
    setInputText('');
    setEncodedValue('');
    setCustomFileName('');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'background.default', color: 'text.primary', pt: 8, pb: 4 }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 6, position: 'relative' }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <IconButton onClick={() => state === 'about' ? reset() : setState('about')} sx={{ position: 'absolute', right: 0, top: 0, color: 'text.secondary' }}>
                {state === 'about' ? <ArrowLeft size={24} /> : <Settings size={24} />}
              </IconButton>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -1, mb: 1, color: 'primary.main' }}>
                MED SECURE VAULT
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Shield size={16} color="#4CAF50" />
                <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 1, color: 'text.secondary' }}>
                  AES-256 MILITARY GRADE ENCRYPTION
                </Typography>
              </Box>
            </motion.div>
          </Box>

          <AnimatePresence mode="wait">
            {state === 'locked' && (
              <motion.div key="locked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Unlock size={64} color={theme.palette.primary.main} />
                  <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>App Locked</Typography>
                  <Typography variant="body2" color="text.secondary">Enter your 4-digit passcode</Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Box key={i} sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${theme.palette.primary.main}`, bgcolor: enteredPin.length > i ? theme.palette.primary.main : 'transparent' }} />
                  ))}
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <Button key={n} variant="outlined" sx={{ width: 64, height: 64, borderRadius: '50%', fontSize: '1.2rem' }} onClick={() => handleUnlock(n.toString())}>{n}</Button>
                  ))}
                  <Box />
                  <Button variant="outlined" sx={{ width: 64, height: 64, borderRadius: '50%', fontSize: '1.2rem' }} onClick={() => handleUnlock('0')}>0</Button>
                  <IconButton onClick={() => setEnteredPin(enteredPin.slice(0, -1))} sx={{ color: 'text.secondary' }}><X size={24} /></IconButton>
                </Box>
                {errorMsg && <Typography color="error" variant="caption" sx={{ mt: 2, fontWeight: 700 }}>{errorMsg}</Typography>}
              </motion.div>
            )}

            {state === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="overline" color="primary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Image Security</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('image'); setState('encode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'primary.main', borderRadius: 2, color: 'background.default' }}><CameraIcon size={24} /></Box>
                          <Box><Typography variant="h6">Encode Image</Typography><Typography variant="body2" color="text.secondary">Secure photos and images</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('image'); setState('decode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'secondary.main', borderRadius: 2, color: 'background.default' }}><Unlock size={24} /></Box>
                          <Box><Typography variant="h6">Decode Image</Typography><Typography variant="body2" color="text.secondary">Extract photos from secure PDF</Typography></Box>
                        </Stack>
                      </Card>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="info.main" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>File Security</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('file'); setState('encode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'info.main', borderRadius: 2, color: 'background.default' }}><FileText size={24} /></Box>
                          <Box><Typography variant="h6">Encode Files</Typography><Typography variant="body2" color="text.secondary">Secure PDFs, Docs, and others</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('file'); setState('decode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'secondary.main', borderRadius: 2, color: 'background.default' }}><Unlock size={24} /></Box>
                          <Box><Typography variant="h6">Decode Files</Typography><Typography variant="body2" color="text.secondary">Extract any document from PDF</Typography></Box>
                        </Stack>
                      </Card>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="warning.main" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Text Security</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => setState('text_encode')}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'warning.main', borderRadius: 2, color: 'background.default' }}><MessageSquare size={24} /></Box>
                          <Box><Typography variant="h6">Text Encoder</Typography><Typography variant="body2" color="text.secondary">Securely encode text messages</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, cursor: 'pointer', transition: '0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => setState('text_decode')}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, color: 'text.primary', border: '1px solid rgba(255,255,255,0.2)' }}><MessageSquare size={24} /></Box>
                          <Box><Typography variant="h6">Text Decoder</Typography><Typography variant="body2" color="text.secondary">Decode secure text messages</Typography></Box>
                        </Stack>
                      </Card>
                    </Stack>
                  </Box>
                </Stack>
              </motion.div>
            )}

            {(state === 'encode_input' || state === 'decode_input') && (
              <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Stack spacing={4}>
                  <Button startIcon={<ArrowLeft size={18} />} onClick={reset} sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>Back</Button>
                  <Typography variant="h5">{state === 'encode_input' ? (mode === 'image' ? 'Encode Image' : 'Encode Files') : (mode === 'image' ? 'Decode Image' : 'Decode Files')}</Typography>
                  <Box sx={{ p: 4, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 4, textAlign: 'center' }}>
                    <input type="file" multiple accept={state === 'decode_input' ? ".pdf" : (mode === 'image' ? "image/*" : "*/*")} onChange={handleFileChange} style={{ display: 'none' }} id="file-upload" />
                    <label htmlFor="file-upload">
                      <Stack spacing={2} alignItems="center" sx={{ cursor: 'pointer' }}>
                        <Upload size={48} color={files.length > 0 ? "#D0BCFF" : "rgba(255,255,255,0.3)"} />
                        <Typography variant="body1" color={files.length > 0 ? "text.primary" : "text.secondary"}>{files.length > 0 ? `${files.length} File(s) selected` : (state === 'encode_input' ? `Drop ${mode === 'image' ? 'Images' : 'Any File(s)'} Here` : 'Drop Encoded PDF Here')}</Typography>
                        <Button component="span" variant="outlined">{files.length > 0 ? 'Add More Files' : 'Select File'}</Button>
                        {state === 'encode_input' && mode === 'image' && <Button variant="contained" startIcon={<CameraIcon size={20} />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCamera(); }}>Add Camera Photo</Button>}
                        {files.length > 0 && state === 'encode_input' && (
                          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 2 }}>
                            {files.map((file, i) => (
                              <Paper key={i} sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <Typography variant="caption">{file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}</Typography>
                                <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(i); }}><Trash2 size={14} color="#f44336" /></IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                        {state === 'decode_input' && Capacitor.isNativePlatform() && <Button variant="outlined" color="secondary" startIcon={<Library size={20} />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenLibrary(); }}>Files Library</Button>}
                      </Stack>
                    </label>
                  </Box>
                  <Stack spacing={2}>
                    {state === 'encode_input' && <TextField fullWidth label="Custom File Name" variant="filled" value={customFileName} onChange={e => setCustomFileName(e.target.value)} />}
                    <TextField fullWidth label="Security Code" type={showPassword ? 'text' : 'password'} value={secret} onChange={e => setSecret(e.target.value)} InputProps={{ endAdornment: <IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</IconButton> }} />
                    {state === 'encode_input' && <TextField fullWidth label="Confirm Code" type="password" value={confirmSecret} onChange={e => setConfirmSecret(e.target.value)} error={secret !== '' && confirmSecret !== '' && secret !== confirmSecret} />}
                  </Stack>
                  <Button variant="contained" size="large" fullWidth disabled={files.length === 0 || !secret || (state === 'encode_input' && secret !== confirmSecret) || loading} onClick={state === 'encode_input' ? handleEncode : handleDecode}>{loading ? <CircularProgress size={24} color="inherit" /> : 'Process'}</Button>
                </Stack>
              </motion.div>
            )}

            {(state === 'text_encode' || state === 'text_decode') && (
              <motion.div key="text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <IconButton onClick={reset} sx={{ mb: 2 }}><ArrowLeft /></IconButton>
                <Typography variant="h4" sx={{ mb: 1 }}>{state === 'text_encode' ? 'Text Lock' : 'Text Unlock'}</Typography>
                <Stack spacing={3}>
                  <TextField multiline rows={4} fullWidth label={state === 'text_encode' ? "Secret Message" : "Encrypted Value"} value={state === 'text_encode' ? inputText : encodedValue} onChange={e => state === 'text_encode' ? setInputText(e.target.value) : setEncodedValue(e.target.value)} />
                  <TextField fullWidth label="Security Code" type="password" value={secret} onChange={e => setSecret(e.target.value)} />
                  <Button variant="contained" size="large" fullWidth onClick={state === 'text_encode' ? handleTextEncode : handleTextDecode} disabled={(!inputText && !encodedValue) || !secret}>Process Text</Button>
                </Stack>
              </motion.div>
            )}

            {state === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle size={80} color="secondary.main" style={{ marginBottom: 24 }} />
                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>Operation Success</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{errorMsg || 'Vault operation completed successfully.'}</Typography>
                  {resultFiles.length > 0 && (
                    <Stack spacing={1.5} sx={{ mb: 4, textAlign: 'left' }}>
                      {resultFiles.map((file, i) => (
                        <Card key={i} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                          <FileText size={20} color="secondary.main" style={{ marginRight: 16 }} />
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>{file.name}</Typography>
                          {file.type.startsWith('image/') && <IconButton size="small" onClick={() => setPreviewFile(file)} color="primary"><Eye size={16} /></IconButton>}
                          <IconButton size="small" onClick={() => handleDownload(file)}><Upload size={16} style={{ transform: 'rotate(180deg)' }} /></IconButton>
                        </Card>
                      ))}
                    </Stack>
                  )}
                  {resultText && (
                    <Card sx={{ p: 3, mb: 4, textAlign: 'left', position: 'relative' }}>
                      <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{resultText}</Typography>
                      <Button startIcon={copied ? <Check /> : <Copy />} onClick={handleCopy} size="small">{copied ? 'Copied' : 'Copy Text'}</Button>
                    </Card>
                  )}
                  {encodedValue && state === 'success' && !resultText && resultFiles.length === 0 && (
                    <Card sx={{ p: 3, mb: 4, textAlign: 'left' }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800 }}>ENCRYPTED VALUE</Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', mb: 2, color: 'text.secondary' }}>{encodedValue}</Typography>
                      <Button startIcon={copied ? <Check /> : <Copy />} onClick={handleCopy} size="small">{copied ? 'Copied' : 'Copy Code'}</Button>
                    </Card>
                  )}
                  <Button variant="contained" fullWidth size="large" onClick={reset}>Done</Button>
                </Box>
              </motion.div>
            )}

            {state === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>Security Settings</Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField label="Set 4-Digit Passcode" variant="filled" type="password" value={appPasscode} onChange={(e) => updatePasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="e.g. 1234" sx={{ flex: 1 }} />
                      <Button variant="outlined" color="error" onClick={() => updatePasscode('')} disabled={!appPasscode}>Disable</Button>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>Storage Settings</Typography>
                    <TextField label="Vault Folder Path" fullWidth variant="filled" value={vaultPath} onChange={(e) => updateVaultPath(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Folder size={18} /></InputAdornment> }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>About</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>MED Secure Vault is an offline-only encryption platform using AES-256 Military Grade Encryption.</Typography>
                    <Button startIcon={<Github size={20} />} variant="outlined" fullWidth href="https://github.com/vsanthoshraj/MED_Encoder" target="_blank">GitHub</Button>
                  </Box>
                  <Button variant="contained" fullWidth onClick={reset}>Done</Button>
                </Stack>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
                <XCircle size={80} color="#F44336" />
                <Typography variant="h6" color="error">Operation Failed</Typography>
                <Button variant="contained" fullWidth onClick={reset}>Try Again</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>

        <Dialog open={Boolean(previewFile)} onClose={() => setPreviewFile(null)} fullScreen PaperProps={{ sx: { bgcolor: '#000', color: '#fff' } }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Zero-Trace Preview</Typography>
            <IconButton onClick={() => setPreviewFile(null)} sx={{ color: '#fff' }}><X size={24} /></IconButton>
          </Box>
          <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
            {previewFile?.type.startsWith('image/') ? <img src={previewFile.data} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Typography variant="h6">Private Document</Typography>}
          </DialogContent>
          <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}><Typography variant="caption" color="text.secondary">Memory wipe on close.</Typography></Box>
        </Dialog>

        <Dialog open={showLibrary} onClose={() => setShowLibrary(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}><Library size={24} /> Files Library</DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {libraryFiles.length === 0 ? <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}><Typography variant="body2">No archives found.</Typography></Box> : (
              <List sx={{ pt: 0 }}>
                {libraryFiles.map((fileName, index) => (
                  <React.Fragment key={fileName}>
                    <ListItem secondaryAction={<IconButton edge="end" color="error" onClick={() => deleteFromLibrary(fileName)}><Trash2 size={18} /></IconButton>} disablePadding>
                      <ListItemButton onClick={() => selectFromLibrary(fileName)}>
                        <ListItemIcon><FileText color="#D0BCFF" /></ListItemIcon>
                        <ListItemText primary={fileName.replace('.pdf', '')} secondary="Secure PDF" primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 500 } }} />
                      </ListItemButton>
                    </ListItem>
                    {index < libraryFiles.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <Box sx={{ p: 2 }}><Button fullWidth onClick={() => setShowLibrary(false)}>Cancel</Button></Box>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

export default App;
