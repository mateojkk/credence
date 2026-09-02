const { ethers } = require("../frontend/node_modules/ethers");
const w = ethers.Wallet.createRandom();
console.log("=== Credence Deployer Wallet ===");
console.log("ADDRESS    :", w.address);
console.log("PRIVATE_KEY:", w.privateKey);
console.log("MNEMONIC   :", w.mnemonic.phrase);
console.log("");
console.log("SAVE THIS SOMEWHERE SAFE. Never share the private key or mnemonic.");
