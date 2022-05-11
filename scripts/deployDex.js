
const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const Balloons = await hre.ethers.getContractFactory("Balloons");
  let balloons=   await Balloons.deploy()
  await balloons.deployed();
  const Dex = await hre.ethers.getContractFactory("DEX");
  let dex=   await Dex.deploy(balloons.address)
    
  // paste in your address here to get 10 balloons on deploy:
  await balloons.transfer("0xc5970c903EB901d4E8e43090142A96A6619d1543",""+(10*10**18));

  // uncomment to init DEX on deploy:
  console.log("Approving DEX ("+dex.address+") to take Balloons from main account...")
  // If you are going to the testnet make sure your deployer account has enough ETH
  await balloons.approve(dex.address,ethers.utils.parseEther('10'));
  console.log("INIT exchange...")
  await dex.init(ethers.BigNumber.from(""+(3*10**18)),{value:ethers.utils.parseEther('0.1')})

};
// Main enter
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
