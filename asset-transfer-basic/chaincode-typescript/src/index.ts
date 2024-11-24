/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contract } from "fabric-contract-api";

import { PaymentChannelContract } from "./assetTransfer";
export { PaymentChannelContract } from './assetTransfer';

// import {type Contract} from 'fabric-contract-api';
// import {AssetTransferContract} from './assetTransfer';
// import { PaymentChannelContract } from './payment-channel-contract/payment-channel';

// export const contracts: typeof Contract[] = [AssetTransferContract];
export const contracts: typeof Contract[] = [PaymentChannelContract];

// export const contracts: string[] = ['PaymentChannelContract'];
