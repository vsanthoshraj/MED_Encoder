import React from 'react';
import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface LegalProps {
    onBack: () => void;
}

export const PrivacyPolicy: React.FC<LegalProps> = ({ onBack }) => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={onBack} sx={{ mb: 2, color: 'text.secondary' }}>Back</Button>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Privacy Policy</Typography>
        <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>1. Privacy by Design</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Angerona is built on the principle of local-only privacy. We do not collect, store, or transmit any personal data, images, or files. All cryptographic operations occur exclusively on your device, ensuring your data never leaves your control.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>2. Data Ownership</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        You retain full ownership of your encrypted content. Because we utilize an offline-first architecture, we have no access to your files or your secret codes. We cannot recover data if your passphrase is lost.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>3. Transparent Permissions</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Access to your camera and storage is used strictly for the functional purpose of capturing and vaulting your media. These permissions are never used for background tracking or analytics.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>4. Commitment to Security</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        We continuously refine our security standards to protect against emerging threats. Any updates to our privacy protocols will be reflected here.
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    </motion.div>
);

export const TermsAndConditions: React.FC<LegalProps> = ({ onBack }) => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <Button startIcon={<ArrowLeft size={18} />} onClick={onBack} sx={{ mb: 2, color: 'text.secondary' }}>Back</Button>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Terms & Conditions</Typography>
        <Paper sx={{ p: 4, borderRadius: '24px', bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>1. Service Agreement</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        By using Angerona, you agree to these terms. This application provides high-security encryption tools for personal and professional data protection.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>2. Security Responsibility</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Security is a shared responsibility. You are responsible for maintaining the confidentiality of your secret codes. Due to the mathematically secure nature of our AES-256 AES ENCRYPTION, there is no master key or recovery process for lost passwords.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>3. Limitation of Liability</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Angerona is provided as a utility for data protection. We are not liable for any data loss resulting from device failure, forgotten passphrases, or unintentional app deletion.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>4. High-Level Encryption Standards</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        While we use ENTERPRISE-GRADE AES-256 AES ENCRYPTION, we encourage users to maintain secondary backups of critical information as part of a robust security strategy.
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>5. Ethical Use</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        You agree to use this technology ethically and legally. Use of this application for unlawful concealment is strictly prohibited.
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    </motion.div>
);
