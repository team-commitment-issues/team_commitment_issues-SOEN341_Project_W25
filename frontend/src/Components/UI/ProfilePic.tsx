import React from 'react';
import styled from 'styled-components';

const ProfilePicContainer = styled.div`
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #777;
    margin-right: 20px;
    border: 2px solid #fff;
    cursor: pointer;
`;

interface ProfilePicProps {
    onClick: () => void;
}

const ProfilePic: React.FC<ProfilePicProps> = ({ onClick }) => {
    return <ProfilePicContainer onClick={onClick} />;
};

export default ProfilePic;