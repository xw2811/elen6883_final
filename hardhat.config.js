require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
    },
    huygens: {
      //blockGasLimit: 100000000429720,
      //gasPrice: 5000000000,
      url: "http://13.212.177.203:8765", //"https://huygens.ccn.org:8545",
      accounts: ["E2596154BE49643D8B971ED433CDE0E1254C5966DAD8236CB29293B92EB96EF4"]
    },
    huygens_dev: {
      //blockGasLimit: 100000000429720,
      //gasPrice: 5000000000,
      url: "http://18.182.45.18:8765",
      accounts: ["E2596154BE49643D8B971ED433CDE0E1254C5966DAD8236CB29293B92EB96EF4"]
    },
},
solidity: "0.8.4",
};
