var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    // development: {
    //   provider: function () {
    //     return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
    //   },
    //   network_id: "*",
    //   gas: 4500000,
    // },
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
      websockets: true,
    },
  },
  compilers: {
    solc: {
      version: "^0.5.0",
    },
  },
};
