import React from 'react';
import { Link } from 'react-router-dom';

interface TextLinkProps {
  text: string;
  linkText: string;
  to: string;
}

const TextLink: React.FC<TextLinkProps> = ({ text, linkText, to }) => {
  return (
    <p style={styles.text}>
      {text} <Link to={to} style={styles.link}>{linkText}</Link>
    </p>
  );
};

const styles = {
  text: {
    marginTop: '15px',
    fontSize: '14px',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
};

export default TextLink;