import styled from 'styled-components';

interface ButtonProps {
    selected: boolean;
}

export const SidebarContainer = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 10%;
    background-color: #242526;
    color: #ffffff;
    overflow-y: auto;
    padding: 10px;
`;

export const ChannelBarContainer = styled.div`
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

export const ChatAreaContainer = styled.div`
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
    justify-content: space-between; // Ensure space between elements
    padding: 0 20px; // Adjust padding to add space on both sides
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

export const Button = styled.button<ButtonProps>`
    display: block;
    width: 100%;
    padding: 10px;
    border: none;
    background: ${({ selected }) => (selected ? '#555' : '#333')};
    color: white;
    text-align: left;
    border-bottom: 1px solid #444;
    cursor: pointer;
    transition: background 0.3s, transform 0.3s;

    &:hover {
        background: #555;
        transform: translateX(10px);
    }
`;

export const ProfilePic = styled.div`
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #777;
    border: 2px solid #fff;
    cursor: pointer;
    margin-right: 20px; // Add margin to the right to separate it from the title
`;

export const DropdownMenu = styled.div`
    position: absolute;
    top: 60px;
    right: 20px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1000;
    div {
        padding: 10px;
        cursor: pointer;
        color: black; // Set text color to black
        &:hover {
            background: #f0f0f0;
        }
    }
`;