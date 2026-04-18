import React, { useState } from 'react';
import styled from 'styled-components';
import api from '../services/api';

const RegistrationContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #2c5530;
  text-align: center;
  margin-bottom: 30px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #333;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #2c5530;
  }
`;


const Button = styled.button`
  background: #2c5530;
  color: white;
  padding: 15px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  
  &:hover {
    background: #1e3a21;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const Message = styled.div`
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
  
  &.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  &.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2c5530;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

function Registration() {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setMessage({
        type: 'error',
        text: 'Veuillez remplir tous les champs obligatoires (Prénom, Nom de famille).'
      });
      setLoading(false);
      return;
    }

    try {
      await api.post('/users/registration-requests', formData);
      
      setMessage({
        type: 'success',
        text: 'Votre demande d\'inscription a été envoyée avec succès. Un administrateur examinera votre demande ; vous serez informé une fois le compte traité (notamment par e-mail si vous l\'avez renseigné).'
      });
      
      // Reset form
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      });
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      
      let errorMessage = 'Une erreur est survenue lors de l\'envoi de votre demande.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegistrationContainer>
      <Title>📝 Inscription RecyClique</Title>
      
      {message.text && (
        <Message className={message.type}>
          {message.text}
        </Message>
      )}
      
      <Form onSubmit={handleSubmit} noValidate>
        <FormGroup>
          <Label htmlFor="username">Identifiant</Label>
          <Input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="@votre_nom_utilisateur"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="first_name">Prénom *</Label>
          <Input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
            placeholder="Votre prénom"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="last_name">Nom de famille *</Label>
          <Input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
            placeholder="Votre nom de famille"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="votre@email.com"
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+33 6 12 34 56 78"
          />
        </FormGroup>



        <Button type="submit" disabled={loading}>
          {loading && <LoadingSpinner />}
          {loading ? 'Envoi en cours...' : 'Envoyer la demande d\'inscription'}
        </Button>
      </Form>
    </RegistrationContainer>
  );
}

export default Registration;
