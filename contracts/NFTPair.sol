pragma solidity ^0.8.0;

// ERC721
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// Wrapper a NFT as a erc20 token with 18 decimels
contract NFTPair is ERC20, IERC721Receiver {
    using SafeMath for uint256;

    // holder the be-wrapped NFT address
    address public nftAddress;
    // Owner address
    address owner;
    // Wiethdraw event
    event Withdraw(uint256[] indexed _tokenIds, uint256[] indexed amounts);

    // create new token
    constructor() {
        owner = msg.sender;
    }

    // init the parameter
    function init(
        string memory _name,
        string memory _symbol,
        address _nftAddress
    ) public payable {
        // Verify author
        require(owner == msg.sender);
        name = _name;
        symbol = _symbol;
        decimals = 18;
        nftAddress = _nftAddress;
    }

    // get infos
    function getInfos()
        public
        view
        returns (
            string memory _name,
            string memory _symbol,
            uint256 _supply
        )
    {
        _name = name;
        _symbol = symbol;
        _supply = totalSupply;
    }

    // withdraw nft and burn tokens
    function withdraw(
        uint256[] calldata _tokenIds,
        uint256[] calldata amounts,
        address recipient
    ) external {
        // First burn the relevent erc20 token amount;
        _burn(msg.sender, _tokenIds.length.mul(1 ether));
        // send back the user NFTs
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            _withdraw721(address(this), recipient, _tokenIds[i]);
        }
        emit Withdraw(_tokenIds, amounts);
    }
    // Depsite with NFT to swap ERC20 tokens
    function multi721Deposit(uint256[] memory _ids, address _referral) public {
        for (uint256 i = 0; i < _ids.length; i++) {
            IERC721(nftAddress).transferFrom(
                msg.sender,
                address(this),
                _ids[i]
            );
        }

        _mint(msg.sender, _ids.length.mul(1 ether));
    }

    function swap721(uint256 _in, uint256 _out) external {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _in);
        IERC721(nftAddress).safeTransferFrom(address(this), msg.sender, _out);
    }

    function _withdraw721(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal {
        IERC721(nftAddress).safeTransferFrom(_from, _to, _tokenId);
    }

    // Erc721 NFT receiver holder;
    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes memory data
    ) public virtual override returns (bytes4) {
        require(nftAddress == msg.sender, "forbidden");
        _mint(operator, 1 ether);
        return this.onERC721Received.selector;
    }

    // set new params
    function setParams(
        uint256 _nftType,
        string calldata _name,
        string calldata _symbol,
        uint256 _nftValue
    ) external {
        require(msg.sender == owner, "!authorized");
        name = _name;
        symbol = _symbol;
    }

    function bytesToAddress(bytes memory b) public view returns (address) {
        uint256 result = 0;
        for (uint256 i = b.length - 1; i + 1 > 0; i--) {
            uint256 c = uint256(uint8(b[i]));

            uint256 to_inc = c * (16**((b.length - i - 1) * 2));
            result += to_inc;
        }
        return address(uint160(result));
    }
}
