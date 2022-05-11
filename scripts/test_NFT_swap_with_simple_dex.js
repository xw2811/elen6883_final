const {ethers} = require("hardhat");
const {web3} = require("hardhat");
const hre = require("hardhat");
async function blockTime() {

    const blockNumber = await ethers.provider.getBlockNumber();
    // let block =await ethers.provider.getBlock(blockNumber-1)
    let block = await web3.eth.getBlock(blockNumber);

    return block.timestamp
}
// Return the GasPrice
async function getGasPrice() {
    let gasPrice = await ethers.provider.getGasPrice();
    let Lower = ethers.utils.parseUnits('1', 'gwei')
    if (gasPrice.lt(Lower)) {
        gasPrice = Lower;
    }
    return gasPrice;
}


// get amount based on tokens in pool 
function getAmountIn(amountOut, reserveIn, reserveOut) {
    let numerator = reserveIn.mul(amountOut).mul(1000);
    let denominator = reserveOut.sub(amountOut).mul(997);
    amountIn = (numerator.div(denominator)).add(1);
    return amountIn;
}

// get amount based on tokens in pool 
function getAmountOut(amountIn, reserveIn, reserveOut) {
    console.log(amountIn);
    let amountInWithFee = amountIn.mul(997);
    let numerator = amountInWithFee.mul(reserveOut);
    let denominator = reserveIn.mul(1000).add(amountInWithFee);
    let amountOut = numerator.div(denominator);
    return amountOut
}


async function main() {

    let [owner, user1, user2] = await ethers.getSigners();

    // First deploy a NFT and NFT_Pair
    const PunkNFTContract = await hre.ethers.getContractFactory("PunkNFT");
    const Punk = await PunkNFTContract.deploy();

    const NFT20PairContract = await hre.ethers.getContractFactory("NFTPair");
    const NFT20Pair = await NFT20PairContract.deploy();
    await NFT20Pair.init("$Punk", "$Punk", Punk.address)

    console.log(owner.address,
        await ethers.provider.getBalance(owner.address)
    );
    console.log("NFT20Pair ", NFT20Pair.address);
    console.log("Punk ", Punk.address);



    // Mint 10 NFT
    let ids = []
    for (let index = 0; index < 10; index++) {
        await Punk.safeMint(owner.address);
        ids.push(index);
    }
    console.log(await Punk.balanceOf(owner.address));

    // Give NFTPair approve of current contract
    await Punk.setApprovalForAll(NFT20Pair.address, true);

    // Deposit to get 10 NFT token 
    let depositeTx = await NFT20Pair.multi721Deposit(ids, ethers.constants.AddressZero);
    await depositeTx.wait();
    console.log(await NFT20Pair.balanceOf(owner.address));
    // Stake the token and eth to uniswap 
    let amount = ethers.utils.parseEther("0.2");
    const Dex = await hre.ethers.getContractFactory("DEX");
    let dex=   await Dex.deploy(NFT20Pair.address)

    await NFT20Pair.approve(dex.address,ethers.constants.MaxUint256);
    console.log("INIT exchange...")
    let initTx=await dex.init(ethers.utils.parseEther("8"),{value:ethers.utils.parseEther('0.2')})
    await initTx.wait()
    console.log(await NFT20Pair.balanceOf(dex.address));
    // User1 buy one NFT token from pool
    let buyAmountPunkToken = ethers.utils.parseEther('0.12')
    let tx= await dex.connect(user1).ethToToken({value:buyAmountPunkToken});
    await tx.wait();
    console.log("user1 nft erc20 balance:", await NFT20Pair.balanceOf(user1.address));
    // User1 withdraw 1NFT by 1 $punk token
    await NFT20Pair.connect(user1).withdraw([1], [1], user1.address);
    console.log(await Punk.balanceOf(user1.address));



    // Mint out 1 NFT to user2
    await Punk.safeMint(user2.address);
    let user2NFTID = await Punk.tokenOfOwnerByIndex(user2.address, 0);
    console.log('user2NFTID', user2NFTID);
    // Deposite for 1 ether $Punk
    await Punk.connect(user2).setApprovalForAll(NFT20Pair.address, true);

    // Deposit to get 10 NFT token 
    tx = await NFT20Pair.connect(user2).multi721Deposit([user2NFTID], ethers.constants.AddressZero);
    await tx.wait();
    let user2Balance = await NFT20Pair.balanceOf(user2.address);
    console.log("token of user2: ", user2Balance)
    // Sell a NFT to pool  
    await NFT20Pair.connect(user2).approve(dex.address, ethers.constants.MaxUint256);
    await dex.connect(user2).tokenToEth(user2Balance);
    let user2ETH = await ethers.provider.getBalance(user2.address);
    console.log("user2 eth :", user2ETH);

}


// Main enter
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
