import React from 'react';
import styled from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TelegramAuthContainer = styled.div`
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
  margin-bottom: 20px;
`;

const Info = styled.p`
  text-align: center;
  font-size: 16px;
  color: #333;
  line-height: 1.5;
  margin-bottom: 28px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Button = styled.button`
  background: #2c5530;
  color: white;
  padding: 15px 30px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  min-width: 150px;

  &:hover {
    background: #1e3a21;
  }
`;

const SecondaryButton = styled(Button)`
  background: #6c757d;

  &:hover {
    background: #545b62;
  }
`;

/**
 * Route historique /telegram-auth : le backend ne propose plus la liaison bot (410).
 * On conserve l'URL pour les liens profonds et on redirige vers inscription (params conservés) ou connexion.
 */
function TelegramAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleRegisterClick = () => {
    const currentParams = searchParams.toString();
    const url = currentParams ? `/inscription?${currentParams}` : '/inscription';
    navigate(url);
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <TelegramAuthContainer>
      <Title>Liaison via Telegram indisponible</Title>
      <Info>
        La liaison automatique de compte depuis Telegram n&apos;est plus proposée. Vous pouvez créer un compte ou vous
        connecter avec vos identifiants RecyClique.
      </Info>
      <ButtonContainer>
        <Button type="button" onClick={handleRegisterClick}>
          S&apos;inscrire
        </Button>
        <SecondaryButton type="button" onClick={handleLoginClick}>
          Se connecter
        </SecondaryButton>
      </ButtonContainer>
    </TelegramAuthContainer>
  );
}

export default TelegramAuth;
