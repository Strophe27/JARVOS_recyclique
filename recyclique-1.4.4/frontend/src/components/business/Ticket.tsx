import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Edit, Trash2, StickyNote } from 'lucide-react';
import { SaleItem } from '../../stores/interfaces/ICashSessionStore';
import { useCashStores } from '../../providers/CashStoreProvider';
import { useCategoryStore } from '../../stores/categoryStore';
import { usePresetStore } from '../../stores/presetStore';
import { useAuthStore } from '../../stores/authStore';
import PresetButtonGrid from '../presets/PresetButtonGrid';
import { Textarea } from '@mantine/core';
import TicketScroller from '../tickets/TicketScroller';
import TicketHighlighter from '../tickets/TicketHighlighter';
import { ScrollPositionManager } from '../../utils/scrollManager';
import { useCashWizardStepState } from '../../hooks/useCashWizardStepState';

const TicketContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: 600px; /* Limit max height for better UX */
`;

const ScrollableTicketArea = styled.div`
  flex: 1;
  min-height: 0; /* Allow flex shrinking */
  display: flex;
  flex-direction: column;
  position: relative;
`;

const ScrollerWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const FixedFooter = styled.div`
  flex-shrink: 0;
  padding: 1.5rem;
  border-top: 2px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 8px 8px;
  margin-top: auto;
`;

const TicketHeader = styled.div`
  padding: 1.5rem 1.5rem 0 1.5rem;
`;

const TicketContent = styled.div`
  padding: 0 1.5rem;
  min-height: 0; /* Allow proper scrolling */
`;


const TicketTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c5530;
  text-align: center;
  border-bottom: 2px solid #2c5530;
  padding-bottom: 0.5rem;
`;

const TicketItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
  gap: 1rem;

  &:last-child {
    border-bottom: none;
  }
`;

const ItemInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ItemCategory = styled.span`
  font-weight: 500;
  color: #333;
`;

const ItemDetails = styled.span`
  font-size: 0.875rem;
  color: #666;
`;

const ItemTotal = styled.span`
  font-weight: bold;
  color: #2c5530;
  min-width: 60px;
  text-align: right;
`;

const ItemActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 2px;

  &.edit {
    background: #ffc107;
    color: #212529;

    &:hover {
      background: #e0a800;
    }
  }

  &.delete {
    background: #dc3545;
    color: white;

    &:hover {
      background: #c82333;
    }
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const TotalSection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #ddd;
`;

const TotalRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 1.1rem;
  color: #2c5530;
`;

const FinalizeButton = styled.button<{ $showBadge?: boolean }>`
  width: 100%;
  padding: 1rem;
  background: #2c5530;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.2s;
  position: relative;

  &:hover {
    background: #234426;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: white;
  color: #2c5530;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  border: 2px solid #2c5530;
  white-space: nowrap;
`;

const EditModal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const EditModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90vw;
`;

const EditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #2c5530;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: 2px solid ${props => props.$variant === 'primary' ? '#2c5530' : '#ddd'};
  background: ${props => props.$variant === 'primary' ? '#2c5530' : 'white'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#333'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: ${props => props.$variant === 'primary' ? '#234426' : '#f0f8f0'};
  }
`;

interface TicketProps {
  items: SaleItem[];
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, newQuantity: number, newWeight: number, newPrice: number, presetId?: string | null, notes?: string) => void;
  onFinalizeSale: () => void;
  loading?: boolean;
  saleNote?: string | null;  // Story B40-P1: Notes sur les tickets de caisse (lecture seule)
}

const Ticket: React.FC<TicketProps> = ({
  items,
  onRemoveItem,
  onUpdateItem,
  onFinalizeSale,
  loading = false,
  saleNote = null  // Story B40-P1: Notes sur les tickets de caisse (lecture seule)
}) => {
  const { getCategoryById, fetchCategories } = useCategoryStore();
  const { selectedPreset, notes, setNotes, presets, fetchPresets } = usePresetStore();
  const { cashSessionStore } = useCashStores();  // B50-P10: Utiliser le store injecté
  const { currentRegisterOptions } = cashSessionStore;
  const { stepState } = useCashWizardStepState();  // Story B49-P2: Pour détecter l'onglet Catégorie actif
  const isAdmin = useAuthStore((s) => s.isAdmin());  // Story B52-P4: Vérifier si l'utilisateur est admin
  
  // Story B49-P2: Détecter si le mode prix global est activé
  const isNoItemPricingEnabled = currentRegisterOptions?.features?.no_item_pricing?.enabled === true;
  
  // Story B49-P2: Badge inversé affiché uniquement quand onglet Catégorie actif
  const showBadge = stepState.currentStep === 'category';
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editWeight, setEditWeight] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editPresetId, setEditPresetId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const scrollManagerRef = useRef<ScrollPositionManager | null>(null);

  // Presets à utiliser dans l'éditeur : presets API ou fallback locaux
  const fallbackPresets = [
    { id: 'don-0', name: 'Don 0€' },
    { id: 'don-18', name: 'Don -18 ans' },
    { id: 'recyclage', name: 'Recyclage' },
    { id: 'decheterie', name: 'Déchèterie' },
  ];
  const editorPresets = (presets && presets.length > 0 ? presets : fallbackPresets).map((p: any) => ({
    id: p.id,
    name: p.name,
  }));

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
    // Story B52-P4: S'assurer que les presets sont disponibles dans l'éditeur d'item
    // Le store gère déjà le cache (5 minutes), donc cet appel est peu coûteux.
    fetchPresets();
  }, [fetchCategories, fetchPresets]);

  const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const totalItems = items.length; // Nombre d'articles (lignes), pas de quantités
  
  // Story B49-P2: Calculer le sous-total (somme des items avec prix >0)
  const subtotal = items.reduce((sum, item) => {
    if (item.price && item.price > 0) {
      return sum + (item.total || 0);
    }
    return sum;
  }, 0);
  
  // Story B49-P2: Afficher sous-total uniquement si au moins un item a un prix >0
  const shouldShowSubtotal = subtotal > 0;

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (scrollManagerRef.current && items.length > 0) {
      // Small delay to ensure DOM is updated with new item
      const timeoutId = setTimeout(() => {
        if (scrollManagerRef.current) {
          scrollManagerRef.current.scrollToBottom();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [items.length]);

  const handleEditClick = (item: SaleItem) => {
    setEditingItem(item);
    setEditQuantity((item.quantity || 1).toString());
    setEditWeight((item.weight || 0).toString());
    setEditPrice(item.price.toString());
    setEditPresetId(item.presetId || null);
    setEditNotes(item.notes || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const newQuantity = parseInt(editQuantity, 10);
      const newWeight = parseFloat(editWeight);
      const newPrice = parseFloat(editPrice);

      if (!isNaN(newQuantity) && !isNaN(newWeight) && !isNaN(newPrice) &&
          newQuantity > 0 && newWeight > 0 && newPrice >= 0) {
        // presetId: undefined => ne pas toucher ; null => effacer ; string => nouveau preset
        const presetIdToSave = editPresetId === null ? null : (editPresetId || null);
        onUpdateItem(editingItem.id, newQuantity, newWeight, newPrice, presetIdToSave, editNotes || undefined);
        setEditingItem(null);
        setEditQuantity('');
        setEditWeight('');
        setEditPrice('');
        setEditPresetId(null);
        setEditNotes('');
      }
    }
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditQuantity('');
    setEditWeight('');
    setEditPrice('');
    setEditPresetId(null);
    setEditNotes('');
  };

  return (
    <>
      <TicketContainer>
        <TicketHeader>
          <TicketTitle>Ticket de Caisse</TicketTitle>
        </TicketHeader>

        <ScrollableTicketArea>
          <ScrollerWrapper>
            <TicketScroller
              maxHeight="400px"
              onScrollManagerReady={(manager) => {
                scrollManagerRef.current = manager;
              }}
            >
            <TicketHighlighter
              scrollManager={scrollManagerRef.current}
              highlightDuration={800}
            >
                <TicketContent>
                  {items.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', margin: '2rem 0' }}>
                      Aucun article ajouté
                    </p>
                  ) : (
                    items.map((item) => {
                      // Get category and subcategory names - prioritize stored names, then lookup
                      const displayName = item.subcategoryName || item.categoryName ||
                                         (item.subcategory ? getCategoryById(item.subcategory)?.name : null) ||
                                         getCategoryById(item.category)?.name ||
                                         item.category;

                      // Story B49-P2: Masquer les montants si item à 0€ en mode prix global
                      const shouldHidePrice = isNoItemPricingEnabled && (item.price === 0 || item.price === undefined);
                      
                      return (
                        <TicketItem key={item.id}>
                          <ItemInfo>
                            <ItemCategory>{displayName}</ItemCategory>
                            <ItemDetails>
                              {/* Story B49-P2: Afficher uniquement catégorie, poids, destination (si preset), notes (si preset) pour items à 0€ */}
                              {shouldHidePrice ? (
                                <>
                                  {`${(item.weight || 0).toFixed(2)} kg`}
                                  {item.presetId && (
                                    <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#2c5530', fontWeight: 'bold' }}>
                                      {(() => {
                                        const preset = presets.find(p => p.id === item.presetId);
                                        return preset ? preset.name : item.presetId;
                                      })()}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                      {item.notes}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {`Qté: ${item.quantity || 1} • ${(item.weight || 0).toFixed(2)} kg • ${(item.price || 0).toFixed(2)} €/unité`}
                                  {item.presetId && (
                                    <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#2c5530', fontWeight: 'bold' }}>
                                      Type: {(() => {
                                        const preset = presets.find(p => p.id === item.presetId);
                                        return preset ? preset.name : item.presetId;
                                      })()}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div style={{ marginTop: '2px', fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                      Notes: {item.notes}
                                    </div>
                                  )}
                                </>
                              )}
                            </ItemDetails>
                          </ItemInfo>
                          {/* Story B49-P2: Masquer ItemTotal si item à 0€ en mode prix global */}
                          {!shouldHidePrice && <ItemTotal>{`${(item.total || 0).toFixed(2)} €`}</ItemTotal>}
                          <ItemActions>
                            <ActionButton
                              className="edit"
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit size={12} />
                            </ActionButton>
                            <ActionButton
                              className="delete"
                              onClick={() => onRemoveItem(item.id)}
                            >
                              <Trash2 size={12} />
                            </ActionButton>
                          </ItemActions>
                        </TicketItem>
                      );
                    })
                  )}
                </TicketContent>
              </TicketHighlighter>
            </TicketScroller>
          </ScrollerWrapper>

          <FixedFooter>
            {/* Story B40-P1-CORRECTION: Champ note déplacé vers popup de paiement */}

            {/* Story B40-P1-CORRECTION: Afficher la note dans le récapitulatif si elle existe */}
            {saleNote && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#856404',
                borderLeft: '4px solid #ff9800'
              }}>
                <StickyNote size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Note contextuelle:</strong> {saleNote}
              </div>
            )}

            <TotalSection>
              {/* Story B49-P2: Afficher sous-total uniquement si au moins un item a un prix >0 */}
              {shouldShowSubtotal && (
                <TotalRow style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 'normal', color: '#666' }}>
                  <span>Sous-total</span>
                  <span>{`${subtotal.toFixed(2)} €`}</span>
                </TotalRow>
              )}
              <TotalRow>
                <span>{totalItems} articles</span>
                <span data-testid="sale-total">{`${totalAmount.toFixed(2)} €`}</span>
              </TotalRow>
            </TotalSection>

            <FinalizeButton
              onClick={onFinalizeSale}
              disabled={loading || items.length === 0}
              $showBadge={showBadge}
            >
              {loading ? 'Finalisation...' : 'Finaliser la vente'}
              {/* Story B49-P2: Badge inversé (fond blanc, texte vert "Entrée") */}
              {showBadge && <Badge>Entrée</Badge>}
            </FinalizeButton>
          </FixedFooter>
        </ScrollableTicketArea>
      </TicketContainer>

      <EditModal $isOpen={!!editingItem} role="dialog" aria-modal="true" aria-label="Modifier l'article">
        <EditModalContent>
          <h3 style={{ display: editingItem ? undefined as any : 'none' }}>Modifier l'article</h3>
          <EditForm onSubmit={handleEditSubmit}>
            <FormGroup>
              <Label>Catégorie</Label>
              <Input
                type="text"
                value={
                  editingItem ? (
                    editingItem.subcategoryName || editingItem.categoryName ||
                    (editingItem.subcategory ? getCategoryById(editingItem.subcategory)?.name : null) ||
                    getCategoryById(editingItem.category)?.name ||
                    editingItem.category
                  ) : ''
                }
                disabled
              />
            </FormGroup>
            <FormGroup>
              <Label>Quantité</Label>
              <Input
                type="number"
                step="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                min="1"
                max="9999"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Poids (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                min="0.01"
                max="9999.99"
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Prix unitaire {!isAdmin && '(Admin uniquement)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                min="0"
                max="9999.99"
                required
                disabled={!isAdmin}
                title={!isAdmin ? "Seuls les administrateurs peuvent modifier le prix" : undefined}
              />
              {!isAdmin && (
                <span style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                  Seuls les administrateurs peuvent modifier le prix
                </span>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Type de transaction (optionnel)</Label>
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {editorPresets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      border: editPresetId === preset.id ? '2px solid #2c5530' : '2px solid #ddd',
                      background: editPresetId === preset.id ? '#e8f5e8' : 'white',
                      color: editPresetId === preset.id ? '#2c5530' : '#333',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      minWidth: 'auto'
                    }}
                    onClick={() => setEditPresetId(editPresetId === preset.id ? null : preset.id)}
                  >
                    {preset.name}
                  </Button>
                ))}
                {editPresetId && (
                  <Button
                    type="button"
                    style={{
                      padding: '6px 12px',
                      background: '#f0f0f0',
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                    onClick={() => setEditPresetId(null)}
                  >
                    ✕ Aucun
                  </Button>
                )}
              </div>
            </FormGroup>

            <FormGroup>
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ajouter des notes pour cette transaction..."
                minRows={2}
                maxRows={4}
                style={{ marginTop: '8px' }}
              />
            </FormGroup>

            <ButtonGroup>
              <Button type="button" onClick={handleEditCancel}>
                Annuler
              </Button>
              <Button type="submit" $variant="primary">
                Valider
              </Button>
            </ButtonGroup>
          </EditForm>
        </EditModalContent>
      </EditModal>
    </>
  );
};

export default Ticket;
