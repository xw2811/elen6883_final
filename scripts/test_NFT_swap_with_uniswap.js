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

// Create swap pair at uniswap-like dex
async function createPairAndAddLiquidity(signer, token, amountToken, amountETH, routerAddr) {
    let routerInstance = await ethers.getContractAt('IUniswapV2Router02', routerAddr);
    console.log(`Approving Router on Token`);

    await token.approve(
        routerInstance.address,
        ethers.constants.MaxInt256, {gasPrice: await getGasPrice()}
    );
    console.log(`Approving Router on WETH`);
    let WETHAddr = await routerInstance.WETH();
    console.log("factory", await routerInstance.factory());
    // Create Pair with Factory and Get Address
    let factoryInstance = await ethers.getContractAt('IUniswapV2Factory', await routerInstance.factory())
    let lpAddress = await factoryInstance.getPair(
        token.address,
        WETHAddr
    );
    if (lpAddress == ethers.constants.AddressZero) {
        console.log(`createing pair....`);
        let createPair = await factoryInstance.createPair(token.address, WETHAddr);
        let recp= await createPair.wait();
        console.log("recp ", recp);
    }
    lpAddress = await factoryInstance.getPair(
        token.address,
        WETHAddr
    );
    console.log(`Lp address ${lpAddress}`)
    let pair = await ethers.getContractAt('IUniswapV2Pair', lpAddress);
    let amtA, amtB, blockTimestampLast;
    [amtA, amtB, blockTimestampLast] = await pair.getReserves();
    console.log(`pool amount ${amtA} ${amtB}`);
    console.log('A');

    console.log(token.address,
        amountToken,

        amountToken.sub(10), // no falsh loan
        amountETH.sub(10), // no falsh loan
        signer.address,
        (await blockTime()) + 20,
        {
            value: amountETH,
            gasPrice: await getGasPrice()
        });
    // add the liquidity
    let addLiq = await routerInstance.connect(signer).addLiquidityETH(
        token.address,
        amountToken,

        amountToken.sub(10), // no falsh loan
        amountETH.sub(10), // no falsh loan
        signer.address,
        (await blockTime()) + 20,

        {
            value: amountETH,
            gasPrice: await getGasPrice()
        }
    );

    await addLiq.wait();
    // console.log(`owner's lp  :  ${await pair.balanceOf(signer.address)}`);

    return [pair, routerInstance];
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

// Buy token with ETH
async function buyToken(signer, tokenAddr, amountOut, router, pair) {
    let amtA, amtB, blockTimestampLast;

    try {
        [amtA, amtB, blockTimestampLast] = await pair.getReserves();
        let WEthInPool = amtA;
        let TkInPool = amtB;
        if (tokenAddr == await pair.token0()) {
            WEthInPool = amtB;
            TkInPool = amtA;
        }


        let amountIn = getAmountIn(amountOut, WEthInPool, TkInPool);
        let path = [await router.WETH(), tokenAddr];
        console.log(amtA, amtB);

        console.log(signer.address, 'ETH ', amountIn.toString(), ' -> token ', amountOut.toString())
        let tx = await router.connect(signer).swapExactETHForTokens(amountOut, path, signer.address,
            (await blockTime()) + 20,
            {
                value: amountIn,
                gasPrice: await getGasPrice()
            })

        await tx.wait();

        console.log(signer.address, 'buy Ok')
        return;
    } catch (error) {
        console.log(error);
        console.log('<<<<<<<<<<<<<<<<<< Fial >>>>>>>>>>>>>>>>>>>>>>>>>>>')

    }
}

// Sell token to swap ETH
async function sellToken(signer, tokenAddr, sellAmount, router, pair) {
    let amtA, amtB, blockTimestampLast;

    try {
        [amtA, amtB, blockTimestampLast] = await pair.getReserves();
        let WEthInPool = amtA;
        let TkInPool = amtB;
        if (tokenAddr == await pair.token0()) {
            WEthInPool = amtB;
            TkInPool = amtA;
        }


        let amountOut = getAmountOut(sellAmount, TkInPool, WEthInPool);
        let path = [tokenAddr, await router.WETH()];
        console.log(amtA, amtB);

        console.log(signer.address, ' token ', sellAmount.toString(), '-> ETH ', amountOut.toString(),)

        let tx = await router.connect(signer).swapExactTokensForETH(sellAmount, amountOut, path, signer.address,
            (await blockTime()) + 20,
            {
                gasPrice: await getGasPrice()
            })
        await tx.wait();

        console.log(signer.address, 'sell  Ok')
        return;
    } catch (error) {
        console.log(error);
        console.log('<<<<<<<<<<<<<<<<<< Fial >>>>>>>>>>>>>>>>>>>>>>>>>>>')

    }
}

async function main() {
    let swapRouterAddr = "0xa2C5ca6361259DdeD81bE7e766a0d005Bcbb6236"

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
    for (let index = 0; index < 2; index++) {
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
    // let swapRouterAddr = "0x8F11E68AaD771C6d9C486446046dBd697735b273"
    let [pair, routerInstance] = await createPairAndAddLiquidity(owner, NFT20Pair, amount, amount, swapRouterAddr);
    // User1 buy one NFT token from pool
    let buyAmountPunkToken = ethers.utils.parseEther('0.12')
    await buyToken(user1, NFT20Pair.address, buyAmountPunkToken, routerInstance, pair);
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
    await NFT20Pair.connect(user2).approve(routerInstance.address, ethers.constants.MaxUint256);
    await sellToken(user2, NFT20Pair.address, user2Balance, routerInstance, pair);
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
