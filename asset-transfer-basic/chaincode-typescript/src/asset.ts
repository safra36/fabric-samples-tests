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
    public signatures: string[] = [];

    constructor() {
        this.signatures = []; // Initialize as empty array
    }
}
