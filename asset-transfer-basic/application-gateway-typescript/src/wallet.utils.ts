import { ec as EC } from 'elliptic';
import * as crypto from 'crypto';

export interface Wallet {
    address: string;
    publicKey: string;
    privateKey: string;
}

export interface MultiSigWallet {
    address: string;
    publicKeys: string[];
    requiredSignatures: number;
}

export class WalletUtils {
    private static readonly ec = new EC('secp256k1');

    /**
     * Creates a new wallet with a keypair and address
     * @returns A new wallet with address, public key, and private key
     */
    public static createWallet(): Wallet {
        // Generate new key pair
        const keyPair = this.ec.genKeyPair();

        // Get public and private keys in hex format
        const publicKey = keyPair.getPublic('hex');
        const privateKey = keyPair.getPrivate('hex');

        // Generate address from public key
        const address = this.generateAddress(publicKey);

        return {
            address,
            publicKey,
            privateKey,
        };
    }

    /**
     * Creates a multi-signature wallet from multiple public keys
     * @param publicKeys Array of public keys that can sign transactions
     * @param requiredSignatures Number of signatures required to validate a transaction
     * @returns MultiSigWallet object with address and public keys
     */
    public static createMultiSigWallet(
        publicKeys: string[],
        requiredSignatures: number
    ): MultiSigWallet {
        if (requiredSignatures > publicKeys.length) {
            throw new Error(
                'Required signatures cannot exceed number of public keys'
            );
        }

        if (requiredSignatures <= 0) {
            throw new Error('Required signatures must be greater than 0');
        }

        // Sort public keys for deterministic address generation
        const sortedKeys = [...publicKeys].sort();

        // Generate multisig address
        const address = this.generateMultiSigAddress(sortedKeys);

        return {
            address,
            publicKeys: sortedKeys,
            requiredSignatures,
        };
    }

    /**
     * Signs a message using a private key
     * @param message Message to sign
     * @param privateKey Private key in hex format
     * @returns Signature in base64 format
     */
    public static sign(message: string, privateKey: string): string {
        const keyPair = this.ec.keyFromPrivate(privateKey);
        const messageHash = crypto
            .createHash('sha256')
            .update(message)
            .digest();
        const signature = keyPair.sign(messageHash);

        const r = signature.r.toArrayLike(Buffer, 'be', 32);
        const s = signature.s.toArrayLike(Buffer, 'be', 32);

        return Buffer.concat([r, s]).toString('base64');
    }

    /**
     * Verifies a signature for a message
     * @param message Original message
     * @param signature Signature in base64 format
     * @param publicKey Public key in hex format
     * @returns boolean indicating if signature is valid
     */
    public static verifySignature(
        message: string,
        signature: string,
        publicKey: string
    ): boolean {
        try {
            const messageHash = crypto
                .createHash('sha256')
                .update(message)
                .digest();
            const publicKeyObj = this.ec.keyFromPublic(publicKey, 'hex');
            const signatureBuffer = Buffer.from(signature, 'base64');

            const signatureObj = {
                r: signatureBuffer.slice(0, 32).toString('hex'),
                s: signatureBuffer.slice(32, 64).toString('hex'),
            };

            return publicKeyObj.verify(messageHash, signatureObj);
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }

    /**
     * Generates a regular address from a public key
     * @param publicKey Public key in hex format
     * @returns Address in base58 format
     */
    private static generateAddress(publicKey: string): string {
        // Create SHA256 hash of public key
        const sha256Hash = crypto
            .createHash('sha256')
            .update(Buffer.from(publicKey, 'hex'))
            .digest();

        // Create RIPEMD160 hash
        const ripemd160Hash = crypto
            .createHash('ripemd160')
            .update(sha256Hash)
            .digest();

        // Add version byte (0x00 for regular address)
        const versionedHash = Buffer.concat([
            Buffer.from([0x00]),
            ripemd160Hash,
        ]);

        // Create checksum (first 4 bytes of double SHA256)
        const checksum = crypto
            .createHash('sha256')
            .update(crypto.createHash('sha256').update(versionedHash).digest())
            .digest()
            .slice(0, 4);

        // Combine versioned hash and checksum
        const binaryAddress = Buffer.concat([versionedHash, checksum]);

        // Encode in base58
        return this.base58Encode(binaryAddress);
    }

    /**
     * Generates a multi-signature address from multiple public keys
     * @param publicKeys Array of public keys in hex format
     * @returns Multi-signature address in base58 format
     */
    private static generateMultiSigAddress(publicKeys: string[]): string {
        try {
            // Create initial hash combining all public keys
            const combinedHash = crypto.createHash('sha256');
            for (const key of publicKeys) {
                combinedHash.update(key);
            }
            const initialHash = combinedHash.digest();

            // Create RIPEMD160 hash
            const ripemd160Hash = crypto
                .createHash('ripemd160')
                .update(initialHash)
                .digest();

            // Add version byte (0x05 for multisig)
            const versionedHash = Buffer.concat([
                Buffer.from([0x05]),
                ripemd160Hash,
            ]);

            // Create checksum (first 4 bytes of double SHA256)
            const checksum = crypto
                .createHash('sha256')
                .update(
                    crypto.createHash('sha256').update(versionedHash).digest()
                )
                .digest()
                .slice(0, 4);

            // Combine versioned hash and checksum
            const binaryAddress = Buffer.concat([versionedHash, checksum]);

            // Encode in base58
            return this.base58Encode(binaryAddress);
        } catch (error) {
            console.error('Multisig address generation error:', error);
            throw new Error('Failed to generate multisig address');
        }
    }

    private static readonly base58Alphabet =
        '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    private static base58Encode(buffer: Buffer): string {
        const digits = [0];

        // Convert to base58 representation
        for (let i = 0; i < buffer.length; i++) {
            let carry = buffer[i];
            for (let j = 0; j < digits.length; j++) {
                carry += digits[j] << 8;
                digits[j] = carry % 58;
                carry = (carry / 58) | 0;
            }
            while (carry > 0) {
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
        }

        // Add leading zeros
        for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
            digits.push(0);
        }

        // Convert to base58 string
        return digits
            .reverse()
            .map((digit) => this.base58Alphabet[digit])
            .join('');
    }
}
