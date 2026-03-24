import React from 'react';
import styled from 'styled-components';
import { X, Keyboard } from 'lucide-react';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
`;

const ModalTitle = styled.h2`
  color: #2c5530;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  color: #666;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }

  &:focus {
    outline: 2px solid #2c5530;
    outline-offset: 2px;
  }
`;

const ShortcutSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: #333;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
`;

const KeyboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const KeyboardRow = styled.div`
  display: contents;
`;

const KeyCell = styled.div<{ $active?: boolean; $key?: string }>`
  background: ${props => props.$active ? '#2c5530' : '#f8f9fa'};
  color: ${props => props.$active ? 'white' : '#333'};
  border: 2px solid ${props => props.$active ? '#2c5530' : '#ddd'};
  border-radius: 6px;
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: bold;
  font-size: 0.9rem;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const KeyLabel = styled.div`
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 0.25rem;
`;

const RowLabel = styled.div`
  font-weight: 600;
  color: #666;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const CategoryList = styled.div`
  margin-top: 1rem;
`;

const CategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 6px;
  background: #f8f9fa;
  margin-bottom: 0.5rem;
`;

const CategoryName = styled.span`
  font-weight: 500;
`;

const CategoryShortcut = styled.span`
  background: #2c5530;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.8rem;
  text-transform: uppercase;
`;

const InfoText = styled.p`
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 1rem 0;
`;

interface CashKeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcutMappings: Array<{ categoryId: string; categoryName: string; key: string }>;
}

/**
 * Modal d'aide affichant les raccourcis clavier AZERTY pour la caisse
 * Présente le mapping 3x10 avec les catégories assignées
 */
export const CashKeyboardHelpModal: React.FC<CashKeyboardHelpModalProps> = ({
  isOpen,
  onClose,
  shortcutMappings
}) => {
  if (!isOpen) return null;

  // Organiser les mappings par rangée (même logique que POSITION_TO_KEY_MAP)
  const row1Mappings = shortcutMappings.slice(0, 10); // A-Z-E-R-T-Y-U-I-O-P
  const row2Mappings = shortcutMappings.slice(10, 20); // Q-S-D-F-G-H-J-K-L-M
  const row3Mappings = shortcutMappings.slice(20, 26); // W-X-C-V-B-N

  const renderKeyboardRow = (mappings: typeof shortcutMappings, expectedKeys: string[]) => {
    return expectedKeys.map((expectedKey, index) => {
      const mapping = mappings[index];
      const isActive = !!mapping;

      return (
        <KeyCell key={expectedKey} $active={isActive} $key={expectedKey}>
          {expectedKey}
          {isActive && (
            <KeyLabel>
              {mapping.categoryName.length > 8
                ? `${mapping.categoryName.substring(0, 8)}...`
                : mapping.categoryName
              }
            </KeyLabel>
          )}
        </KeyCell>
      );
    });
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Keyboard size={20} />
            Raccourcis Clavier Caisse
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Fermer l'aide">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <InfoText>
          Utilisez les touches AZERTY pour sélectionner rapidement une catégorie.
          Les raccourcis sont organisés en 3 rangées comme sur votre clavier.
        </InfoText>

        <ShortcutSection>
          <SectionTitle>Rangée 1 (AZERTYUIOP)</SectionTitle>
          <RowLabel>A Z E R T Y U I O P</RowLabel>
          <KeyboardGrid>
            <KeyboardRow>
              {renderKeyboardRow(row1Mappings, ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'])}
            </KeyboardRow>
          </KeyboardGrid>
        </ShortcutSection>

        <ShortcutSection>
          <SectionTitle>Rangée 2 (QSDFGHJKLM)</SectionTitle>
          <RowLabel>Q S D F G H J K L M</RowLabel>
          <KeyboardGrid>
            <KeyboardRow>
              {renderKeyboardRow(row2Mappings, ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'])}
            </KeyboardRow>
          </KeyboardGrid>
        </ShortcutSection>

        <ShortcutSection>
          <SectionTitle>Rangée 3 (WXCVBN)</SectionTitle>
          <RowLabel>W X C V B N</RowLabel>
          <KeyboardGrid>
            <KeyboardRow>
              {renderKeyboardRow(row3Mappings, ['W', 'X', 'C', 'V', 'B', 'N'])}
            </KeyboardRow>
          </KeyboardGrid>
        </ShortcutSection>

        <ShortcutSection>
          <SectionTitle>Liste des Raccourcis</SectionTitle>
          <CategoryList>
            {shortcutMappings.map(({ categoryId, categoryName, key }) => (
              <CategoryItem key={categoryId}>
                <CategoryName>{categoryName}</CategoryName>
                <CategoryShortcut>{key.toUpperCase()}</CategoryShortcut>
              </CategoryItem>
            ))}
          </CategoryList>
        </ShortcutSection>

        <InfoText>
          <strong>Note :</strong> Les raccourcis ne fonctionnent que lors de la sélection de catégorie
          et sont désactivés quand vous saisissez du texte dans les champs.
        </InfoText>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CashKeyboardHelpModal;
