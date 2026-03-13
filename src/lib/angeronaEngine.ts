import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Angerona Engine - Secure Offline Image Encoding & Decoding
 * Provides military-grade AES-256-GCM encryption for files and text.
 */

const ANGERONA_MARKER_START = '[[ANGERONA_DATA_START]]';
const ANGERONA_MARKER_END = '[[ANGERONA_DATA_END]]';

export interface DecodedFile {
    data: string;
    name: string;
    type: string;
}

export const angeronaEngine = {
    /**
     * Internal: Derives a 256-bit AES key from a secret and salt using PBKDF2
     */
    async deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt.buffer as ArrayBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encodes multiple files to a single PDF container with AES-256-GCM encryption
     */
    async encode(files: File[], secret: string): Promise<Uint8Array> {
        // 1. Prepare raw data for encryption
        const fileDataArray = await Promise.all(files.map(async (file) => {
            const data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            return { data, name: file.name, type: file.type };
        }));

        const rawJson = JSON.stringify({ files: fileDataArray });
        const encoder = new TextEncoder();
        const rawBytes = encoder.encode(rawJson);

        // 2. Encrypt using AES-256-GCM
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(secret, salt);
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            rawBytes
        );

        // 3. Create PDF Container
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 450]);
        const { height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText('ANGERONA - SECURE ARCHIVE', { x: 50, y: height - 50, size: 24, font, color: rgb(0.4, 0.2, 0.6) });
        page.drawText('Shielded with military-grade AES-256-GCM encryption.', { x: 50, y: height - 100, size: 13 });
        page.drawText(`Contains ${files.length} secure file(s). Status: ENCRYPTED`, { x: 50, y: height - 140, size: 12, color: rgb(0.1, 0.6, 0.1) });
        page.drawText('Open this in the Angerona App to unlock.', { x: 50, y: 30, size: 9 });

        const pdfBytes = await pdfDoc.save();

        // 4. Bundle: Marker + Salt(16) + IV(12) + Ciphertext
        const payload = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        payload.set(salt, 0);
        payload.set(iv, salt.length);
        payload.set(new Uint8Array(ciphertext), salt.length + iv.length);

        const metadataString = `\n\n${ANGERONA_MARKER_START}${btoa(String.fromCharCode(...payload))}${ANGERONA_MARKER_END}\n%%EOF`;
        const metadataBytes = encoder.encode(metadataString);

        const finalPdf = new Uint8Array(pdfBytes.length + metadataBytes.length);
        finalPdf.set(pdfBytes);
        finalPdf.set(metadataBytes, pdfBytes.length);

        return finalPdf;
    },

    /**
     * Decodes files from an AES-256-GCM encrypted PDF container
     */
    async decode(pdfBuffer: ArrayBuffer, secret: string): Promise<DecodedFile[]> {
        const decoder = new TextDecoder();
        const content = decoder.decode(pdfBuffer);

        if (!content.includes(ANGERONA_MARKER_START) || !content.includes(ANGERONA_MARKER_END)) {
            throw new Error('This file is not a valid Angerona Secure PDF.');
        }

        const base64Payload = content.split(ANGERONA_MARKER_START)[1].split(ANGERONA_MARKER_END)[0];
        const payload = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0));

        try {
            // Extract Salt, IV, and Ciphertext
            const salt = payload.slice(0, 16);
            const iv = payload.slice(16, 28);
            const ciphertext = payload.slice(28);

            const key = await this.deriveKey(secret, salt);
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                ciphertext
            );

            const decryptedData = JSON.parse(decoder.decode(decryptedBuffer));
            return decryptedData.files;
        } catch (e) {
            throw new Error('Unlock failed. Decryption error (Incorrect Password or Corrupted Data).');
        }
    },

    /**
     * Encodes plain text using military-grade AES-256-GCM
     */
    async textEncode(text: string, secret: string): Promise<string> {
        const encoder = new TextEncoder();
        const rawBytes = encoder.encode(text);

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(secret, salt);
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, rawBytes);

        const payload = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        payload.set(salt, 0);
        payload.set(iv, salt.length);
        payload.set(new Uint8Array(ciphertext), salt.length + iv.length);

        return `ANGERONA_V4_${btoa(String.fromCharCode(...payload))}`;
    },

    /**
     * Decodes AES-256-GCM encrypted text
     */
    async textDecode(encodedValue: string, secret: string): Promise<string> {
        if (!encodedValue.startsWith('ANGERONA_V4_')) {
            throw new Error('Unsupported text format. Only v4.0 Secure Text is supported.');
        }

        const base64 = encodedValue.replace('ANGERONA_V4_', '');
        const payload = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

        try {
            const salt = payload.slice(0, 16);
            const iv = payload.slice(16, 28);
            const ciphertext = payload.slice(28);

            const key = await this.deriveKey(secret, salt);
            const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
            return new TextDecoder().decode(decryptedBuffer);
        } catch (e) {
            throw new Error('Unlock failed. Incorrect Password.');
        }
    }
};
