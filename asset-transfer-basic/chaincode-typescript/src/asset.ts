import {Object, Property} from 'fabric-contract-api';

@Object()
export class PartyAddress {
    @Property()
    public address: string = '';

    @Property()
    public publicKey: string = '';
}

@Object()
export class Channel {
    @Property()
    public channelId: string = '';

    @Property()
    public party1: PartyAddress = new PartyAddress();

    @Property()
    public party2: PartyAddress = new PartyAddress();

    @Property()
    public balance1: number = 0;

    @Property()
    public balance2: number = 0;

    @Property()
    public status: string = ChannelStatus.PROPOSED;

    @Property()
    public nonce: number = 0;

    @Property()
    public multiSigAddress: string = '';

    @Property()
    public createdAt: number = 0;

    @Property()
    public closedAt?: number;

    @Property()
    public fundingTxId?: string;

    @Property()
    public settlementTx1Id?: string;

    @Property()
    public settlementTx2Id?: string;
}

export enum ChannelStatus {
    PROPOSED = 'PROPOSED',
    ACTIVE = 'ACTIVE',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    DISPUTED = 'DISPUTED'
}

@Object()
export class ChannelState {
    @Property()
    public channelId: string = '';

    @Property()
    public balance1: number = 0;

    @Property()
    public balance2: number = 0;

    @Property()
    public nonce: number = 0;

    @Property()
    public signature1: string = '';  // Changed from signatures array to individual properties

    @Property()
    public signature2: string = '';  // Changed from signatures array to individual properties
}



@Object()
export class Wallet {
    @Property()
    public address: string = '';

    @Property()
    public publicKey: string = '';

    @Property()
    public balance: number = 0;
    
    @Property()
    public nonce: number = 0;  // For transaction ordering
}

@Object()
export class Transaction {
    @Property()
    public txId: string = '';

    @Property()
    public fromAddress: string = '';

    @Property()
    public toAddress: string = '';

    @Property()
    public amount: number = 0;

    @Property()
    public timestamp: number = 0;

    @Property()
    public type: TransactionType = TransactionType.REGULAR;

    @Property()
    public status: TransactionStatus = TransactionStatus.PENDING;

    @Property()
    public channelId?: string;  // If related to a payment channel

    @Property()
    public timelock?: number;   // Optional timelock timestamp
}

@Object()
export class TimeLockState {
    @Property()
    public channelId: string = '';

    @Property()
    public state: ChannelState = new ChannelState()

    @Property()
    public timelock: number = 0;  // Timestamp when state can be submitted

    @Property()
    public sequence: number = 0;  // For ordering states

    @Property()
    public submittedBy?: string;  // Address of party who submitted
}

export enum TransactionType {
    REGULAR = 'REGULAR',
    CHANNEL_FUNDING = 'CHANNEL_FUNDING',
    CHANNEL_SETTLEMENT = 'CHANNEL_SETTLEMENT',
    TIMELOCK_SETTLEMENT = 'TIMELOCK_SETTLEMENT'
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED'
}
