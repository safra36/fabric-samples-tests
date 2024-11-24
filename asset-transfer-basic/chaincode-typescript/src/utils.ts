import { Context } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';
import { ChannelState, PartyAddress } from './asset';

export class ChannelUtils {
    private static readonly ec = new EC('secp256k1');

    public static async putState(ctx: Context, key: string, value: any): Promise<void> {
        await ctx.stub.putState(
            key,
            Buffer.from(stringify(sortKeysRecursive(value)))
        );
    }

    public static async getState(ctx: Context, key: string): Promise<any> {
        const bytes = await ctx.stub.getState(key);
        if (!bytes || bytes.length === 0) {
            return null;
        }
        return JSON.parse(bytes.toString());
    }

    public static validateSignatures(state: ChannelState, party1: PartyAddress, party2: PartyAddress): boolean {
        try {
            // Create message hash from channel state (excluding signatures)
            const messageHash = this.createStateHash(state);

            // Verify both signatures
            const validSig1 = this.verifySignature(messageHash, state.signature1, party1.publicKey);
            const validSig2 = this.verifySignature(messageHash, state.signature2, party2.publicKey);

            return validSig1 && validSig2;
        } catch (error) {
            console.error('Signature validation error:', error);
            return false;
        }
    }

    private static createStateHash(state: ChannelState): Buffer {
        // Create deterministic string from state (excluding signatures)
        const stateString = stringify({
            channelId: state.channelId,
            balance1: state.balance1,
            balance2: state.balance2,
            nonce: state.nonce
        });

        // Create SHA256 hash
        return crypto.createHash('sha256').update(stateString).digest();
    }

    private static verifySignature(messageHash: Buffer, signature: string, publicKeyHex: string): boolean {
        if (!signature || !publicKeyHex) {
            return false;
        }

        try {
            const publicKey = this.ec.keyFromPublic(publicKeyHex, 'hex');
            const signatureBuffer = Buffer.from(signature, 'base64');
            const signatureObj = {
                r: signatureBuffer.slice(0, 32).toString('hex'),
                s: signatureBuffer.slice(32, 64).toString('hex')
            };

            return publicKey.verify(messageHash, signatureObj);
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }

    public static generateMultiSigAddress(party1: PartyAddress, party2: PartyAddress): string {
        try {
            // Combine public keys in sorted order for deterministic result
            const sortedKeys = [party1.publicKey, party2.publicKey].sort();

            // Create initial hash combining both public keys
            const combinedHash = crypto.createHash('sha256')
                .update(sortedKeys[0])
                .update(sortedKeys[1])
                .digest();

            // Create RIPEMD160 hash from the SHA256 hash
            const ripemd160Hash = crypto.createHash('ripemd160')
                .update(combinedHash)
                .digest();

            // Add version byte (0x05 for multisig)
            const versionedHash = Buffer.concat([Buffer.from([0x05]), ripemd160Hash]);

            // Create checksum (first 4 bytes of double SHA256)
            const checksum = crypto.createHash('sha256')
                .update(
                    crypto.createHash('sha256')
                        .update(versionedHash)
                        .digest()
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

    private static readonly base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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
            .map(digit => this.base58Alphabet[digit])
            .join('');
    }
}
