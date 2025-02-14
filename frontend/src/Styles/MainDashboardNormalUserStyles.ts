import styled from 'styled-components';

export const Sidebar = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 10%;
    background-color: #242526;
    color: #ffffff;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
`;

export const ChannelBar = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 10%;
    width: 15%;
    background-color: #18191a;
    color: #ffffff;
    overflow-y: auto;
    padding: 10px;
`;

export const ChatArea = styled.div`
    position: absolute;
    left: 25%;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: #ffffff;
    color: #050505;
`;

export const Header = styled.div`
    height: 10%;
    background: linear-gradient(135deg, #1e1e1e, #383838);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between; // Ensures items are spread from left to right
    padding: 0 20px;
    position: relative; // Needed for absolute positioning of children
`;

export const ProfilePic = styled.div`
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #777;
    border: 2px solid #fff;
    cursor: pointer;
    position: absolute;
    right: 20px; // Positions the profile picture to the far right
    top: 50%; // Center it vertically
    transform: translateY(-50%); // Adjust positioning precisely
`;
export const Button = styled.button<{ selected?: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px;
    margin: 3px 0;
    border: none;
    background: ${({ selected }) => selected ? 'rgb(137, 103, 74)' : '#444'};
    color: white;
    text-align: left;
    transition: background 0.3s, transform 0.3s;

    .team-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: #888;
        margin-right: 10px;
    }

    &:hover {
        background: #555;
        transform: translateX(10px);
    }
`;

export const DropdownMenu = styled.div`
    position: absolute;
    right: 10px;
    top: 60px;
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
    width: auto; // Adjust based on content size
    min-width: 180px; // Increased to 1.2 times larger
    font-size: 1.2em; // Makes text larger, adhering to 1.2 scale factor
    color: black; // Ensures text is black

    div {
        padding: 12px 18px; // Increased padding for better spacing
        cursor: pointer;
        &:hover {
            background-color: #f2f2f2;
        }
    }
`;
