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
  InputAdornment,
  useMediaQuery,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Unlock,
  ArrowLeft,
  Upload,
  XCircle,
  Camera as CameraIcon,
  Library,
  Trash2,
  FileText,
  MessageSquare,
  Copy,
  Check,
  Settings as SettingsIcon,
  Github,
  Eye,
  EyeOff,
  X,
  Folder,
  Shield,
  Plus,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  Mail,
  Lock,
  FileText as FileIcon,
  Star,
  Share2
} from 'lucide-react';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { App as AppCap } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';
import { getAppTheme } from './theme';
import { angeronaEngine } from './lib/angeronaEngine';
import type { DecodedFile } from './lib/angeronaEngine';
import { PrivacyPolicy, TermsAndConditions } from './Legal';

type AppState = 'home' | 'encode_input' | 'decode_input' | 'text_encode' | 'text_decode' | 'success' | 'error' | 'about' | 'locked' | 'privacy' | 'terms';


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
  const [vaultPath, setVaultPath] = useState(localStorage.getItem('angerona_vault_path') || 'Angerona/Encrypted');
  const [appPasscode, setAppPasscode] = useState(localStorage.getItem('angerona_app_passcode') || '');
  const [enteredPin, setEnteredPin] = useState('');
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [pickerPath, setPickerPath] = useState('');
  const [currentFolderItems, setCurrentFolderItems] = useState<{ name: string; type: 'file' | 'directory' }[]>([]);
  const [lastEncodedFile, setLastEncodedFile] = useState<{ name: string; data: string; url: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(localStorage.getItem('angerona_theme_mode') as any || 'system');

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const paletteMode = themeMode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : themeMode;
  const currentTheme = React.useMemo(() => getAppTheme(paletteMode as 'light' | 'dark'), [paletteMode]);

  const clipboardTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleReLock = () => {
      const savedPasscode = localStorage.getItem('angerona_app_passcode');
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

  useEffect(() => {
    if (state === 'decode_input') {
      loadLibrary();
    }
  }, [state]);

  const handleUnlock = (digit: string) => {
    const newPin = enteredPin + digit;
    if (newPin.length <= 4) {
      setEnteredPin(newPin);
      if (newPin.length === 4) {
        const saved = localStorage.getItem('angerona_app_passcode');
        if (newPin === saved || newPin === appPasscode) {
          setState('home');
          setEnteredPin('');
        } else {
          setErrorMsg('Invalid Code');
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
      localStorage.setItem('angerona_app_passcode', newPin);
      setState('locked');
      setEnteredPin('');
    } else if (newPin === '') {
      localStorage.removeItem('angerona_app_passcode');
    }
  };

  const updateVaultPath = (newPath: string) => {
    setVaultPath(newPath);
    localStorage.setItem('angerona_vault_path', newPath);
  };

  const updateThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    localStorage.setItem('angerona_theme_mode', mode);
  };

  const openFolderPicker = async () => {
    setPickerPath(vaultPath);
    await loadPickerFolders(vaultPath);
    setFolderPickerOpen(true);
  };

  const loadPickerFolders = async (path: string) => {
    if (!Capacitor.isNativePlatform()) {
      alert("Folder selection is only available on native platforms.");
      return;
    }
    try {
      const result = await Filesystem.readdir({
        path: path,
        directory: Directory.Documents
      });
      setCurrentFolderItems(result.files.map(f => ({ name: f.name, type: f.type as 'file' | 'directory' })));
      setPickerPath(path);
    } catch (err) {
      console.error("Failed to load folders", err);
      // Fallback to root if path fails
      try {
        const result = await Filesystem.readdir({
          path: '',
          directory: Directory.Documents
        });
        setCurrentFolderItems(result.files.map(f => ({ name: f.name, type: f.type as 'file' | 'directory' })));
        setPickerPath('');
      } catch (innerErr) {
        console.error("Failed to load root folders", innerErr);
      }
    }
  };

  const handleEnterFolder = (name: string) => {
    const newPath = pickerPath === '' ? name : `${pickerPath}/${name}`;
    loadPickerFolders(newPath);
  };

  const handleGoUp = () => {
    if (pickerPath === '') return;
    const parts = pickerPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    loadPickerFolders(newPath);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const path = pickerPath === '' ? newFolderName.trim() : `${pickerPath}/${newFolderName.trim()}`;
      await Filesystem.mkdir({
        path: path,
        directory: Directory.Documents,
        recursive: true
      });
      setNewFolderName('');
      setShowNewFolderInput(false);
      loadPickerFolders(pickerPath);
    } catch (err) {
      console.error("Failed to create folder", err);
    }
  };

  const handleSelectFolder = () => {
    updateVaultPath(pickerPath);
    setFolderPickerOpen(false);
  };


  const loadLibrary = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await Filesystem.readdir({
        path: vaultPath,
        directory: Directory.Documents,
      });
      const skFiles = result.files
        .map(f => f.name)
        .filter(name => name.toLowerCase().endsWith('.sk') || name.toLowerCase().endsWith('.pdf'))
        .sort((a, b) => b.localeCompare(a));
      setLibraryFiles(skFiles);
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
    if (files.length >= 12) {
      alert("Maximum 12 files allowed per protected archive.");
      return;
    }
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
      if (state === 'decode_input' || mode === 'file') {
        setFiles([selectedFiles[0]]);
      } else {
        const remainingAllowed = 12 - files.length;
        if (remainingAllowed <= 0) {
          alert("Maximum 12 files allowed per protected archive.");
          return;
        }

        if (selectedFiles.length > remainingAllowed) {
          alert(`The current vault capacity is 12 files. Adding only ${remainingAllowed} more item(s).`);
          setFiles(prev => [...prev, ...selectedFiles.slice(0, remainingAllowed)]);
        } else {
          setFiles(prev => [...prev, ...selectedFiles]);
        }
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
      const pdfBytes = await angeronaEngine.encode(files, secret);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const namePrefix = customFileName.trim() || 'Archive';
      const finalName = `${namePrefix}_${Date.now()}.sk`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = btoa(pdfBytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
        await Filesystem.writeFile({
          path: `${vaultPath}/${finalName}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        setErrorMsg(`Vault: Documents/${vaultPath}/${finalName}`);
        setLastEncodedFile({ name: finalName, data: base64Data, url: '' });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = finalName;
        a.click();
        setErrorMsg(`Downloaded: ${finalName}`);
        setLastEncodedFile({ name: finalName, data: '', url: url });
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
      const decodedFiles = await angeronaEngine.decode(buffer, secret);
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
      const encoded = await angeronaEngine.textEncode(inputText, secret);
      setEncodedValue(encoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleTextDecode = async () => {
    if (!encodedValue || !secret) return;
    try {
      const decoded = await angeronaEngine.textDecode(encodedValue, secret);
      setResultText(decoded);
      setState('success');
    } catch (err) {
      setState('error');
    }
  };

  const handleShare = async (file?: any) => {
    try {
      if (state === 'success' && !file && lastEncodedFile) {
        // Sharing encoded vault
        if (Capacitor.isNativePlatform()) {
          // On Android/iOS, get URI from stored path
          const uri = await Filesystem.getUri({
            path: `${vaultPath}/${lastEncodedFile.name}`,
            directory: Directory.Documents
          });
          await Share.share({
            title: 'Share Secure Vault',
            text: 'Here is your Angerona secure vault.',
            url: uri.uri,
            dialogTitle: 'Share Secure Vault'
          });
        } else {
          // Web fallback
          if (navigator.share) {
            await navigator.share({
              title: 'Secure Vault',
              text: 'Angerona Secure Vault',
              url: window.location.href // Fallback since sharing file from memory is tricky on web
            });
          } else {
            alert('Sharing is not supported on this browser.');
          }
        }
      } else if (file) {
        // Sharing specific file from results
        if (Capacitor.isNativePlatform()) {
          // Native sharing of decrypted file
          const base64Data = file.data.split(',')[1];
          const tempPath = `Angerona/temp_${file.name}`;
          await Filesystem.writeFile({
            path: tempPath,
            data: base64Data,
            directory: Directory.Cache
          });
          const uri = await Filesystem.getUri({
            path: tempPath,
            directory: Directory.Cache
          });
          await Share.share({
            title: file.name,
            url: uri.uri
          });
        } else {
          if (navigator.share) {
            const blob = await (await fetch(file.data)).blob();
            const shareFile = new File([blob], file.name, { type: file.type });
            await navigator.share({
              files: [shareFile],
              title: file.name
            });
          } else {
            alert('Sharing not supported');
          }
        }
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleDownload = async (file: DecodedFile) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = file.data.split(',')[1];
        await Filesystem.writeFile({
          path: `Angerona/Decrypted/${file.name}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        alert(`Saved to: Documents/Angerona/Decrypted/${file.name}`);
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
    setLastEncodedFile(null);
  };

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'background.default', color: 'text.primary', pt: 8, pb: 4 }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 6, position: 'relative' }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              {state !== 'success' && (
                <IconButton onClick={() => state === 'about' ? reset() : setState('about')} sx={{ position: 'absolute', right: 0, top: 0, color: 'text.secondary' }}>
                  {state === 'about' ? <ArrowLeft size={24} /> : <SettingsIcon size={24} />}
                </IconButton>
              )}
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: -1, mb: 1, color: 'primary.main', textTransform: 'uppercase' }}>
                ANGERONA
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Shield size={16} color="#4CAF50" />
                <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 1, color: 'text.secondary', opacity: 0.8 }}>
                  SAFE • PRIVATE • OFFLINE
                </Typography>
              </Box>
            </motion.div>
          </Box>

          <AnimatePresence mode="wait">
            {state === 'locked' && (
              <motion.div key="locked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Unlock size={64} color={currentTheme.palette.primary.main} />
                  <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>App Locked</Typography>
                  <Typography variant="body2" color="text.secondary">Enter your 4-digit passcode</Typography>
                </Box>
                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <Box key={i} sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${currentTheme.palette.primary.main}`, bgcolor: enteredPin.length > i ? currentTheme.palette.primary.main : 'transparent' }} />
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
                    <Typography variant="overline" color="primary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Photo Security</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('image'); setState('encode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'primary.main', borderRadius: '16px', color: 'background.default', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><CameraIcon size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Lock My Photos</Typography><Typography variant="body2" color="text.secondary">Hide your private photos in a safe place.</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('image'); setState('decode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'secondary.main', borderRadius: '16px', color: 'background.default', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><Unlock size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Unlock My Photos</Typography><Typography variant="body2" color="text.secondary">Get your original photos back anytime.</Typography></Box>
                        </Stack>
                      </Card>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="info.main" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>File Security</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('file'); setState('encode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'info.main', borderRadius: '16px', color: 'background.default', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><FileText size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Lock My Files</Typography><Typography variant="body2" color="text.secondary">Protect your important documents with a code.</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => { setMode('file'); setState('decode_input'); }}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'secondary.main', borderRadius: '16px', color: 'background.default', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><Unlock size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Open My Files</Typography><Typography variant="body2" color="text.secondary">Unlock and see your protected files.</Typography></Box>
                        </Stack>
                      </Card>
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="warning.main" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>Secret Text</Typography>
                    <Stack spacing={2}>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => setState('text_encode')}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'warning.main', borderRadius: '16px', color: 'background.default', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><MessageSquare size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Secret Text</Typography><Typography variant="body2" color="text.secondary">Turn your message into a safe code.</Typography></Box>
                        </Stack>
                      </Card>
                      <Card sx={{ p: 3, borderRadius: '24px', cursor: 'pointer', transition: '0.3s', border: '1px solid rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-4px)' } }} onClick={() => setState('text_decode')}>
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Box sx={{ p: 1.8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: 'text.primary', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><MessageSquare size={24} /></Box>
                          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Decode Message</Typography><Typography variant="body2" color="text.secondary">Unlock and read your secret text.</Typography></Box>
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

                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: state === 'decode_input' ? 3 : 0 }}>
                      {state === 'encode_input' ? (mode === 'image' ? 'Lock Photos' : 'Lock Documents') : (mode === 'image' ? 'Unlock Photos' : 'Unlock Documents')}
                    </Typography>

                    {state === 'decode_input' && (
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                          <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 1.2 }}>Angerona Gallery</Typography>
                          {libraryFiles.length > 5 && (
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={handleOpenLibrary}>View All</Typography>
                          )}
                        </Stack>

                        {libraryFiles.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1, mx: -2, px: 2, '&::-webkit-scrollbar': { display: 'none' }, scrollSnapType: 'x mandatory' }}>
                            {libraryFiles.slice(0, 10).map((fileName) => (
                              <Card
                                key={fileName}
                                onClick={() => selectFromLibrary(fileName)}
                                sx={{
                                  minWidth: 140,
                                  p: 2,
                                  borderRadius: '24px',
                                  cursor: 'pointer',
                                  scrollSnapAlign: 'start',
                                  bgcolor: files[0]?.name === fileName ? 'rgba(208, 188, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                                  border: files[0]?.name === fileName ? `2px solid ${currentTheme.palette.primary.main}` : '1px solid rgba(255,255,255,0.05)',
                                  transition: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': { transform: 'translateY(-4px)', bgcolor: 'rgba(255,255,255,0.06)' }
                                }}
                              >
                                <Stack spacing={1.5} alignItems="center">
                                  <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    <Shield size={20} color={currentTheme.palette.primary.main} />
                                  </Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {fileName.replace(/\.(sk|pdf)$/i, '')}
                                  </Typography>
                                </Stack>
                              </Card>
                            ))}
                          </Box>
                        ) : (
                          <Paper sx={{ p: 3, borderRadius: '24px', textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>No encrypted archives found in your vault.</Typography>
                          </Paper>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ p: 4, border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '32px', textAlign: 'center', transition: '0.3s', '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <input type="file" multiple={mode === 'image' && state !== 'decode_input'} accept={state === 'decode_input' ? ".sk,.pdf" : (mode === 'image' ? "image/*" : "*/*")} onChange={handleFileChange} style={{ display: 'none' }} id="file-upload" />
                    <label htmlFor="file-upload">
                      <Stack spacing={2} alignItems="center" sx={{ cursor: 'pointer' }}>
                        <Upload size={48} color={files.length > 0 ? currentTheme.palette.primary.main : "rgba(255,255,255,0.3)"} />
                        <Typography variant="body1" sx={{ fontWeight: 600 }} color={files.length > 0 ? "text.primary" : "text.secondary"}>
                          {files.length > 0
                            ? (state === 'decode_input' || mode === 'file' ? files[0].name : `${files.length}/12 Items Selected`)
                            : (state === 'encode_input' ? `Upload ${mode === 'image' ? 'Images' : 'your file'} here` : 'Upload encrypted PDF to decrypt')}
                        </Typography>
                        <Button component="span" variant="outlined" sx={{ borderRadius: '50px', px: 4 }} disabled={state === 'encode_input' && mode === 'image' && files.length >= 12}>{files.length > 0 ? (mode === 'file' ? 'Replace File' : 'Add Samples') : 'Select Source'}</Button>
                        {state === 'encode_input' && mode === 'image' && <Button variant="contained" startIcon={<CameraIcon size={20} />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCamera(); }} disabled={files.length >= 12} sx={{ borderRadius: '50px' }}>Camera</Button>}
                        {files.length > 0 && state === 'encode_input' && (
                          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 2 }}>
                            {files.map((file, i) => (
                              <Paper key={i} sx={{ px: 2, py: 0.8, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>{file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}</Typography>
                                <IconButton size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFile(i); }} sx={{ p: 0.5 }}><X size={14} color="#f44336" /></IconButton>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                        {state === 'decode_input' && !Capacitor.isNativePlatform() && <Typography variant="caption" color="text.secondary">Library is only available on native device storage.</Typography>}
                        {state === 'encode_input' && mode === 'image' && <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontWeight: 600 }}>You can upload up to 12 images at a time.</Typography>}
                      </Stack>
                    </label>
                  </Box>
                  <Stack spacing={2}>
                    {state === 'encode_input' && <TextField fullWidth label="File Name" variant="filled" value={customFileName} onChange={e => setCustomFileName(e.target.value)} placeholder="e.g. My private files" InputProps={{ sx: { borderRadius: '16px 16px 0 0' } }} />}
                    <TextField fullWidth label="Secret Password" type={showPassword ? 'text' : 'password'} value={secret} onChange={e => setSecret(e.target.value)} InputProps={{ sx: { borderRadius: state === 'encode_input' ? '0' : '16px' }, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</IconButton></InputAdornment> }} />
                    {state === 'encode_input' && <TextField fullWidth label="Confirm Password" type="password" value={confirmSecret} onChange={e => setConfirmSecret(e.target.value)} error={secret !== '' && confirmSecret !== '' && secret !== confirmSecret} InputProps={{ sx: { borderRadius: '0 0 16px 16px' } }} />}
                  </Stack>
                  <Button variant="contained" size="large" fullWidth disabled={files.length === 0 || !secret || (state === 'encode_input' && secret !== confirmSecret) || loading} onClick={state === 'encode_input' ? handleEncode : handleDecode} sx={{ py: 2, borderRadius: '50px', fontWeight: 800 }}>{loading ? <CircularProgress size={24} color="inherit" /> : (state === 'encode_input' ? 'Lock Now' : 'Unlock Now')}</Button>
                </Stack>
              </motion.div>
            )}

            {(state === 'text_encode' || state === 'text_decode') && (
              <motion.div key="text" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <IconButton onClick={reset} sx={{ mb: 2 }}><ArrowLeft /></IconButton>
                <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{state === 'text_encode' ? 'Secret Text' : 'Decode Message'}</Typography>
                <Stack spacing={3}>
                  <TextField multiline rows={4} fullWidth label={state === 'text_encode' ? "Write your message here..." : "Paste the secret code here..."} value={state === 'text_encode' ? inputText : encodedValue} onChange={e => state === 'text_encode' ? setInputText(e.target.value) : setEncodedValue(e.target.value)} />
                  <TextField fullWidth label="Secret Password" type="password" value={secret} onChange={e => setSecret(e.target.value)} />
                  {state === 'text_encode' && (
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={confirmSecret}
                      onChange={e => setConfirmSecret(e.target.value)}
                      error={confirmSecret !== '' && secret !== confirmSecret}
                      helperText={confirmSecret !== '' && secret !== confirmSecret ? "Passwords do not match" : ""}
                    />
                  )}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={state === 'text_encode' ? handleTextEncode : handleTextDecode}
                    disabled={(!inputText && !encodedValue) || !secret || (state === 'text_encode' && secret !== confirmSecret)}
                    sx={{ borderRadius: '50px', py: 2 }}
                  >
                    {state === 'text_encode' ? 'Lock Text' : 'Unlock Message'}
                  </Button>
                </Stack>
              </motion.div>
            )}

            {state === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  {resultFiles.length > 0 && (
                    <Paper
                      onClick={() => {
                        if (resultFiles.length > 0) {
                          setPreviewFile(resultFiles[0]);
                        }
                      }}
                      sx={{
                        width: '100%',
                        aspectRatio: '1/1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '32px',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        mb: 4,
                        cursor: resultFiles.length > 0 ? 'pointer' : 'default',
                        transition: '0.3s',
                        '&:hover': {
                          bgcolor: resultFiles.length > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'
                        }
                      }}
                    >
                      <Eye size={120} color={currentTheme.palette.secondary.main} strokeWidth={1.5} />
                      <Typography variant="caption" sx={{ mt: 2, opacity: 0.5, fontWeight: 600 }}>Click to preview</Typography>
                    </Paper>
                  )}

                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 800 }}>Success!</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 6 }}>
                    {resultFiles.length > 0
                      ? (resultFiles.length === 1 ? 'Your file is ready' : 'Your files are ready')
                      : 'Everything is safe now'}
                  </Typography>

                  <Stack spacing={2}>
                    {resultFiles.length > 0 && resultFiles.length === 1 && (
                      <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                        <Button variant="outlined" color="primary" fullWidth size="large" onClick={() => setPreviewFile(resultFiles[0])} sx={{ py: 2, borderRadius: '50px', fontWeight: 700 }}>
                          View
                        </Button>
                        <Button variant="contained" color="secondary" fullWidth size="large" onClick={() => handleDownload(resultFiles[0])} sx={{ py: 2, borderRadius: '50px', fontWeight: 700 }}>
                          Download
                        </Button>
                        <IconButton
                          onClick={() => handleShare(resultFiles[0])}
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            p: 2,
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <Share2 size={24} color={currentTheme.palette.primary.main} />
                        </IconButton>
                      </Stack>
                    )}

                    {resultFiles.length > 1 && (
                      <Box sx={{ mb: 2, textAlign: 'left' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: 'block', opacity: 0.6 }}>YOUR FILES</Typography>
                        <Stack spacing={1}>
                          {resultFiles.map((file, i) => (
                            <Paper key={i} sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.05)' }}>
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{file.name}</Typography>
                              <IconButton size="small" onClick={() => setPreviewFile(file)} color="primary" sx={{ mr: 1 }}><Eye size={18} /></IconButton>
                              <IconButton size="small" onClick={() => handleDownload(file)} color="primary" sx={{ mr: 1 }}><Upload size={16} style={{ transform: 'rotate(180deg)' }} /></IconButton>
                              <IconButton size="small" onClick={() => handleShare(file)} color="primary"><Share2 size={16} /></IconButton>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {resultText && (
                      <Card sx={{ p: 3, mb: 2, textAlign: 'left', bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, opacity: 0.6 }}>ORIGINAL MESSAGE</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{resultText}</Typography>
                        <Button startIcon={copied ? <Check /> : <Copy />} onClick={handleCopy} size="small">{copied ? 'Copied' : 'Copy Text'}</Button>
                      </Card>
                    )}

                    {!resultText && encodedValue && (
                      <Card sx={{ p: 3, mb: 2, textAlign: 'left', bgcolor: 'rgba(255,255,255,0.02)' }}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, opacity: 0.6 }}>SECRET CODE</Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', mb: 2, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.2)', p: 1.5, borderRadius: '8px' }}>{encodedValue}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button startIcon={copied ? <Check /> : <Copy />} onClick={handleCopy} size="small" fullWidth variant="outlined" sx={{ borderRadius: '8px' }}>{copied ? 'Copied' : 'Copy Code'}</Button>
                          <Button startIcon={<Share2 size={16} />} onClick={() => {
                            if (navigator.share) {
                              navigator.share({ title: 'Secret Code', text: encodedValue });
                            }
                          }} size="small" variant="outlined" sx={{ borderRadius: '8px', minWidth: 'fit-content' }}>Share</Button>
                        </Stack>
                      </Card>
                    )}

                    {state === 'success' && lastEncodedFile && resultFiles.length === 0 && (
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={<Share2 />}
                        onClick={() => handleShare()}
                        sx={{
                          py: 2,
                          borderRadius: '50px',
                          fontWeight: 700,
                          bgcolor: 'primary.main',
                          color: 'background.default',
                          mb: 2,
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        Share Secure Vault
                      </Button>
                    )}

                    <Button variant="contained" fullWidth size="large" onClick={reset} sx={{ py: 2, borderRadius: '50px', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.1)', color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                      Done
                    </Button>
                  </Stack>
                </Box>
              </motion.div>
            )}

            {state === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Stack spacing={3}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Settings</Typography>

                    {/* Theme Selection */}
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>Theme</Typography>
                      <Paper variant="outlined" sx={{ p: 0.5, borderRadius: 50, bgcolor: paletteMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <ToggleButtonGroup
                          value={themeMode}
                          exclusive
                          onChange={(_, val) => val && updateThemeMode(val)}
                          fullWidth
                          sx={{
                            '& .MuiToggleButton-root': { border: 'none', borderRadius: 50, py: 1.2, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 },
                            '& .Mui-selected': {
                              color: currentTheme.palette.primary.main,
                              bgcolor: paletteMode === 'dark' ? 'rgba(208, 188, 255, 0.12) !important' : 'rgba(103, 80, 164, 0.08) !important'
                            }
                          }}
                        >
                          <ToggleButton value="light" sx={{ gap: 1 }}>
                            <Sun size={16} /> Light
                          </ToggleButton>
                          <ToggleButton value="dark" sx={{ gap: 1 }}>
                            <Moon size={16} /> Dark
                          </ToggleButton>
                          <ToggleButton value="system" sx={{ gap: 1 }}>
                            <SettingsIcon size={16} /> Default
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Paper>
                    </Box>

                    {/* App Security */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>App Security</Typography>
                    <Card sx={{ mb: 4, borderRadius: '32px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <List disablePadding>
                        <ListItem sx={{ py: 3, px: 4 }}>
                          <ListItemIcon sx={{ minWidth: 44 }}><Lock size={22} /></ListItemIcon>
                          <ListItemText
                            primary="4-Digit Passcode"
                            secondary={appPasscode ? "Status: Enabled" : "Status: Disabled"}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                            secondaryTypographyProps={{ variant: 'caption', sx: { opacity: 0.7 } }}
                          />
                          <TextField
                            size="small"
                            type="password"
                            value={appPasscode}
                            onChange={(e) => updatePasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                            placeholder="Set PIN"
                            sx={{ width: 100 }}
                            InputProps={{ sx: { borderRadius: '20px', height: 40 } }}
                          />
                        </ListItem>
                        <Divider sx={{ mx: 4, opacity: 0.2 }} />
                        <ListItem sx={{ py: 3, px: 4 }}>
                          <ListItemIcon sx={{ minWidth: 44 }}><Folder size={22} /></ListItemIcon>
                          <ListItemText
                            primary="Vault Location"
                            secondary={vaultPath}
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 700 }}
                            secondaryTypographyProps={{ sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px', fontSize: '0.75rem', opacity: 0.7 } }}
                          />
                          <IconButton onClick={openFolderPicker} color="primary" sx={{ bgcolor: paletteMode === 'dark' ? 'rgba(208, 188, 255, 0.1)' : 'rgba(103, 80, 164, 0.1)', width: 36, height: 36 }}>
                            <Plus size={20} />
                          </IconButton>
                        </ListItem>
                      </List>
                    </Card>

                    {/* Support & Support Items */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>Support</Typography>
                    <Card sx={{ borderRadius: '32px', overflow: 'hidden', mb: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <List disablePadding>
                        {[
                          { text: 'Contact Us', icon: <Mail size={20} /> },
                          { text: 'Privacy policy', icon: <Shield size={20} />, action: () => setState('privacy') },
                          { text: 'Terms & Condition', icon: <FileIcon size={20} />, action: () => setState('terms') },
                          { text: 'Rate us', icon: <Star size={20} /> },
                          { text: 'Github', icon: <Github size={20} />, href: 'https://github.com/vsanthoshraj/Angerona' },
                        ].map((item, idx, arr) => (
                          <React.Fragment key={item.text}>
                            <ListItemButton
                              component={item.href ? "a" : "div"}
                              href={item.href}
                              target={item.href ? "_blank" : undefined}
                              onClick={item.action}
                              sx={{ py: 2.8, px: 4 }}
                            >
                              <ListItemIcon sx={{ minWidth: 44 }}>{item.icon}</ListItemIcon>
                              <ListItemText primary={item.text} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                              <ChevronRight size={18} opacity={0.4} />
                            </ListItemButton>
                            {idx < arr.length - 1 && <Divider sx={{ mx: 4, opacity: 0.2 }} />}
                          </React.Fragment>
                        ))}
                      </List>
                    </Card>
                  </Box>
                  <Button variant="contained" fullWidth onClick={reset} size="large" sx={{ py: 2, borderRadius: 50, fontWeight: 800 }}>Done</Button>
                </Stack>
              </motion.div>
            )}

            {state === 'privacy' && <PrivacyPolicy onBack={() => setState('about')} />}
            {state === 'terms' && <TermsAndConditions onBack={() => setState('about')} />}

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
          <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', overflow: 'hidden' }}>
            {previewFile?.type.startsWith('image/') ? (
              <img src={previewFile.data} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : previewFile?.type === 'application/pdf' ? (
              <iframe src={previewFile.data} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview" />
            ) : (
              <Stack alignItems="center" spacing={2}>
                <FileText size={80} color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{previewFile?.name}</Typography>
                <Typography variant="body2" color="text.secondary">Preview not available for this file type.</Typography>
                <Button variant="contained" onClick={() => handleDownload(previewFile)} sx={{ borderRadius: '50px' }}>Save to Device</Button>
              </Stack>
            )}
          </DialogContent>
          <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}><Typography variant="caption" color="text.secondary">Memory wipe on close.</Typography></Box>
        </Dialog>

        <Dialog open={showLibrary} onClose={() => setShowLibrary(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '32px', bgcolor: 'background.paper', backgroundImage: 'none' } }}>
          <DialogTitle sx={{ fontWeight: 800, px: 3, pt: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Library size={24} />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Files Library</Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {libraryFiles.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center', opacity: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>No archives found.</Typography>
              </Box>
            ) : (
              <List sx={{ py: 1 }}>
                {libraryFiles.map((fileName, index) => (
                  <React.Fragment key={fileName}>
                    <ListItem
                      secondaryAction={
                        <IconButton edge="end" color="error" onClick={() => deleteFromLibrary(fileName)} sx={{ bgcolor: 'rgba(244, 67, 54, 0.08)', mr: 1 }}>
                          <Trash2 size={18} />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton onClick={() => selectFromLibrary(fileName)} sx={{ px: 3, py: 2 }}>
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <FileText color={currentTheme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText
                          primary={fileName.replace(/\.(sk|pdf)$/i, '')}
                          secondary="Angerona Secure Vault (.sk)"
                          primaryTypographyProps={{ variant: 'body2', sx: { fontWeight: 700 } }}
                          secondaryTypographyProps={{ variant: 'caption', sx: { opacity: 0.6 } }}
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < libraryFiles.length - 1 && <Divider sx={{ mx: 3, opacity: 0.5 }} />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </DialogContent>
          <Box sx={{ p: 3 }}>
            <Button fullWidth variant="outlined" onClick={() => setShowLibrary(false)} sx={{ borderRadius: '50px', py: 1.5, fontWeight: 700 }}>
              Close Library
            </Button>
          </Box>
        </Dialog>

        <Dialog open={folderPickerOpen} onClose={() => setFolderPickerOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '32px', bgcolor: 'background.paper', backgroundImage: 'none' } }}>
          <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Folder size={24} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Select Folder</Typography>
            </Box>
            <IconButton onClick={() => setShowNewFolderInput(!showNewFolderInput)} color="primary" sx={{ bgcolor: paletteMode === 'dark' ? 'rgba(208, 188, 255, 0.1)' : 'rgba(103, 80, 164, 0.1)' }}>
              <Plus size={20} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 1.5, bgcolor: paletteMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <IconButton size="small" onClick={handleGoUp} disabled={pickerPath === ''}>
                <ChevronLeft size={18} />
              </IconButton>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Documents/{pickerPath || 'Root'}
              </Typography>
            </Box>

            {showNewFolderInput && (
              <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="New folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  InputProps={{ sx: { borderRadius: '12px' } }}
                />
                <Button variant="contained" onClick={handleCreateFolder} sx={{ borderRadius: '12px', px: 3 }}>Add</Button>
              </Box>
            )}

            <List sx={{ py: 1, maxHeight: '40vh', overflow: 'auto' }}>
              {currentFolderItems.filter(i => i.type === 'directory').length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center', opacity: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>No subfolders found.</Typography>
                </Box>
              ) : (
                currentFolderItems.filter(i => i.type === 'directory').map((item) => (
                  <ListItem key={item.name} disablePadding>
                    <ListItemButton onClick={() => handleEnterFolder(item.name)} sx={{ px: 3, py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 40 }}><Folder size={20} color={currentTheme.palette.primary.main} /></ListItemIcon>
                      <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
                      <ChevronRight size={16} opacity={0.4} />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </DialogContent>
          <Box sx={{ p: 3, display: 'flex', gap: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setFolderPickerOpen(false)} sx={{ borderRadius: '50px', py: 1.5, fontWeight: 700 }}>Cancel</Button>
            <Button fullWidth variant="contained" onClick={handleSelectFolder} sx={{ borderRadius: '50px', py: 1.5, fontWeight: 700 }}>Select Current</Button>
          </Box>
        </Dialog>
      </Box >
    </ThemeProvider >
  );
}

export default App;
