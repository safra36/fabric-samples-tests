

# Working and testing hyperledger

- to get list of org docker containers:
```sh
docker ps -a | grep "dev-peer"
```

- to view logs and check what's wrong
```sh
docker logs -f 3c0e05fe7fbf
```

- deploy or update chaincode
```sh
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript/ -ccl typescript
```

- add peer command to enviorments
```sh
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

```

- query example:
```sh
peer chaincode query -C mychannel -n basic -c '{"function":"GetChannel","Args":["channel1"]}'
```

- to invoke
```sh
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt

peer chaincode invoke -o localhost:7050   --ordererTLSHostnameOverride orderer.example.com   --tls --cafile $ORDERER_CA   --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA   --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA   -C mychannel   -n basic   --waitForEvent   -c '{"function":"ProposeChannel","Args":["channel1", "party1addr", "party1pubkey", "party2addr", "party2pubkey", "100", "100"]}'
```