import React from 'react';

interface FormGroupProps {
  label: string;
  children: React.ReactNode;
}

const FormGroup: React.FC<FormGroupProps> = ({ label, children }) => {
  return (
    <div style={styles.formGroup}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
};

const styles = {
  formGroup: {
    marginBottom: '15px',
    width: '100%',
    textAlign: 'left' as const
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: '14px',
    color: '#555'
  }
};

export default FormGroup;
