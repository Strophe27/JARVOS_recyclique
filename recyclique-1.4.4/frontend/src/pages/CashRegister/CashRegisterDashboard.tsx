import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cashRegisterDashboardService, cashSessionService } from '../../services/cashSessionService';
import { Card, Badge, Group, Button, SimpleGrid, Title, Container, LoadingOverlay, Text, Menu, ActionIcon } from '@mantine/core';
import { useCashSessionStoreInjected, useCashStores } from '../../providers/CashStoreProvider';
import { useAuthStore } from '../../stores/authStore';  // B44-P1: Pour vérifier les permissions
import { PlayCircle, Calendar, MoreVertical, Settings } from 'lucide-react';

interface RegisterStatus {
  id: string;
  name: string;
  is_open: boolean;
  enable_virtual?: boolean;
  enable_deferred?: boolean;
  location?: string | null;
}

const RegisterCard: React.FC<{ reg: RegisterStatus; onOpen: (id: string) => void; onResume: (id: string) => void }>
  = ({ reg, onOpen, onResume }) => {
  // Story B49-P5: T5 - Afficher localisation pour toutes les caisses réelles (pas les cartes virtuelles/différées du dashboard)
  // Note: Une caisse peut avoir enable_virtual/enable_deferred activés mais être quand même une caisse physique avec localisation
  // On affiche la localisation pour toutes les caisses qui ne sont pas les cartes spéciales du dashboard
  const hasLocation = reg.location && typeof reg.location === 'string' && reg.location.trim() !== '';
  
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group position="apart" mb="xs">
        <div>
          <Title order={4}>{reg.name}</Title>
          {/* Story B49-P5: T5 - Affichage localisation sous titre caisse */}
          {hasLocation && (
            <Text size="md" c="dimmed" mt={4} style={{ fontWeight: 'normal', fontSize: '0.95rem', color: '#666' }}>
              {reg.location}
            </Text>
          )}
        </div>
        <Badge color={reg.is_open ? 'green' : 'gray'}>{reg.is_open ? 'Ouverte' : 'Fermée'}</Badge>
      </Group>
      <Group position="right">
        {reg.is_open ? (
          <Button color="green" onClick={() => onResume(reg.id)}>Reprendre</Button>
        ) : (
          <Button onClick={() => onOpen(reg.id)}>Ouvrir</Button>
        )}
      </Group>
    </Card>
  );
};

const CashRegisterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cashSessionStore, isVirtualMode, isDeferredMode } = useCashStores();
  const { resumeSession } = cashSessionStore;
  const { currentUser, hasPermission, hasVirtualCashAccess, hasDeferredCashAccess } = useAuthStore();  // B50-P4: Pour vérifier les permissions
  const [loading, setLoading] = useState(true);
  const [registers, setRegisters] = useState<RegisterStatus[]>([]);
  
  // B50-P4: Vérifier si l'utilisateur peut accéder à la saisie différée (permission ou rôle admin)
  const canAccessDeferred = hasDeferredCashAccess() || currentUser?.role === 'admin' || currentUser?.role === 'super-admin';
  
  // B50-P4: Vérifier si l'utilisateur peut accéder à la caisse virtuelle
  const canAccessVirtual = hasVirtualCashAccess();
  
  // B50-P4: Vérifier si l'utilisateur peut accéder aux caisses réelles
  const canAccessRealCash = hasPermission('caisse.access');
  
  // Vérifier si l'utilisateur est SuperAdmin pour afficher le menu de gestion
  const isSuperAdmin = currentUser?.role === 'super-admin';
  
  // B49-P3: Calculer si au moins une caisse a enable_virtual ou enable_deferred activé
  const hasVirtualEnabled = registers.some(r => r.enable_virtual === true);
  const hasDeferredEnabled = registers.some(r => r.enable_deferred === true);

  // B44-P1: En mode différé, rediriger automatiquement vers l'ouverture de session
  useEffect(() => {
    if (isDeferredMode) {
      navigate('/cash-register/deferred/session/open', { replace: true });
      return;
    }
  }, [isDeferredMode, navigate]);

  // B50-P4: Charger les caisses même en mode virtuel/différé pour trouver la première avec enable_virtual/enable_deferred=true
  // IMPORTANT: Rafraîchir les données à chaque montage de la page pour avoir l'état réel des caisses
  useEffect(() => {
    const load = async () => {
      // En mode virtuel/différé, on charge quand même les caisses pour trouver la source
      if (isVirtualMode || isDeferredMode) {
        setLoading(true);
        try {
          const list = await cashRegisterDashboardService.getRegistersStatus();
          setRegisters(list);
        } catch (error) {
          console.error('Erreur lors du chargement des caisses:', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Mode réel : charger les caisses normalement
      setLoading(true);
      try {
        const list = await cashRegisterDashboardService.getRegistersStatus();
        setRegisters(list);
      } catch (error) {
        console.error('Erreur lors du chargement des caisses:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isVirtualMode, isDeferredMode]);

  // Rafraîchir les données quand on revient sur la page (changement de route)
  useEffect(() => {
    // Ne rafraîchir que si on est en mode réel (pas virtuel/différé)
    if (!isVirtualMode && !isDeferredMode) {
      const load = async () => {
        try {
          const list = await cashRegisterDashboardService.getRegistersStatus();
          setRegisters(list);
        } catch (error) {
          console.error('Erreur lors du rafraîchissement des caisses:', error);
        }
      };
      load();
    }
  }, [location.pathname, isVirtualMode, isDeferredMode]);

  // B49-P7: Passer register_id via route params au lieu de state
  const handleOpen = (registerId: string) => {
    const basePath = isVirtualMode ? '/cash-register/virtual' : '/cash-register';
    navigate(`${basePath}/session/open?register_id=${registerId}`);
  };

  const handleResume = async (registerId: string) => {
    const basePath = isVirtualMode ? '/cash-register/virtual' : '/cash-register';
    
    if (isVirtualMode) {
      // En mode virtuel, utiliser le store virtuel directement
      const { currentSession } = cashSessionStore;
      if (currentSession && currentSession.status === 'open') {
        navigate(`${basePath}/sale`);
        return;
      }
      // Sinon, ouvrir une nouvelle session
      navigate(`${basePath}/session/open`);
      return;
    }

    // Mode réel : récupérer l'ID de session ouverte et reprendre immédiatement
    const status = await cashSessionService.getRegisterSessionStatus(registerId);
    if (status.is_active && status.session_id) {
      const ok = await resumeSession(status.session_id);
      if (ok) {
        navigate(`${basePath}/sale`);
        return;
      }
    }
    // Fallback 1: essayer la session courante opérateur
    const current = await cashSessionService.getCurrentSession();
    if (current && current.status === 'open') {
      // Hydrater le store et naviguer
      // On réutilise resumeSession pour persistance + état
      const ok2 = await resumeSession(current.id);
      if (ok2) {
        navigate(`${basePath}/sale`);
        return;
      }
    }
    // Fallback: si pas de session détectée, aller à l'ouverture
    navigate(`${basePath}/session/open?register_id=${registerId}`);
  };

  // B50-P4: Trouver la première caisse avec enable_virtual=true pour hériter des options
  const getFirstVirtualRegister = (): string | null => {
    const virtualRegister = registers.find(r => r.enable_virtual === true);
    return virtualRegister?.id || null;
  };

  // B50-P4: Trouver la première caisse avec enable_deferred=true pour hériter des options
  const getFirstDeferredRegister = (): string | null => {
    const deferredRegister = registers.find(r => r.enable_deferred === true);
    return deferredRegister?.id || null;
  };

  const handleVirtualCashRegister = () => {
    // B50-P4: Passer le register_id de la première caisse virtuelle pour hériter des options
    const firstVirtualRegisterId = getFirstVirtualRegister();
    if (firstVirtualRegisterId) {
      navigate(`/cash-register/virtual/session/open?register_id=${firstVirtualRegisterId}`);
    } else {
      // Fallback si aucune caisse virtuelle trouvée
      navigate('/cash-register/virtual/session/open');
    }
  };

  const handleOpenVirtualSession = () => {
    // B50-P4: Passer le register_id de la première caisse virtuelle pour hériter des options
    const firstVirtualRegisterId = getFirstVirtualRegister();
    if (firstVirtualRegisterId) {
      navigate(`/cash-register/virtual/session/open?register_id=${firstVirtualRegisterId}`);
    } else {
      navigate('/cash-register/virtual/session/open');
    }
  };

  const handleResumeVirtualSession = async () => {
    // Vérifier s'il y a une session virtuelle active
    const { currentSession } = cashSessionStore;
    if (currentSession && currentSession.status === 'open') {
      navigate('/cash-register/virtual/sale');
    } else {
      // Pas de session active, ouvrir une nouvelle session
      navigate('/cash-register/virtual/session/open');
    }
  };

  // B50-P4: Handler pour la saisie différée - passer le register_id de la première caisse différée pour hériter des options
  const handleDeferredCashRegister = () => {
    const firstDeferredRegisterId = getFirstDeferredRegister();
    if (firstDeferredRegisterId) {
      navigate(`/cash-register/deferred/session/open?register_id=${firstDeferredRegisterId}`);
    } else {
      // Fallback si aucune caisse différée trouvée
      navigate('/cash-register/deferred/session/open');
    }
  };

  // Interface virtuelle : afficher uniquement la carte virtuelle
  if (isVirtualMode) {
    const { currentSession } = cashSessionStore;
    const hasActiveSession = currentSession && currentSession.status === 'open';
    
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Caisse Virtuelle - Mode Entraînement</Title>
        <SimpleGrid cols={1} spacing="lg" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
          <Card 
            shadow="sm" 
            padding="xl" 
            radius="md" 
            withBorder
            style={{ 
              borderStyle: 'dashed',
              borderColor: '#667eea',
              backgroundColor: '#f8f9fa',
              borderWidth: '2px'
            }}
          >
            <Group position="apart" mb="md">
              <Group spacing="xs">
                <PlayCircle size={24} color="#667eea" />
                <Title order={3}>Caisse Virtuelle</Title>
              </Group>
              <Badge color="blue" variant="filled" size="lg">MODE FORMATION</Badge>
            </Group>
            <Text size="md" mb="md" c="dimmed">
              Mode d'entraînement sans impact sur les données réelles. 
              Toutes les opérations sont simulées localement.
            </Text>
            {/* B49-P3: Affichage caisse source pour traçabilité */}
            {cashSessionStore.currentSession?.register_id && (
              <Text size="sm" mb="xl" c="dimmed" style={{ fontStyle: 'italic' }}>
                Hérite des options de workflow de la caisse source
              </Text>
            )}
            <Group position="right">
              <Button 
                color="blue" 
                variant="filled"
                size="lg"
                onClick={handleOpenVirtualSession}
                leftSection={<PlayCircle size={20} />}
              >
                Ouvrir une Session d'Entraînement
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={handleResumeVirtualSession}
                disabled={!hasActiveSession}
              >
                Reprendre la Session
              </Button>
            </Group>
          </Card>
        </SimpleGrid>
      </Container>
    );
  }

  // Interface réelle : afficher les caisses réelles + carte virtuelle
  return (
    <Container size="lg" py="xl">
      <LoadingOverlay visible={loading} />
      <Group position="apart" mb="lg" align="center">
        <Title order={2}>Sélection du Poste de Caisse</Title>
        {isSuperAdmin && (
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon 
                variant="subtle" 
                color="gray" 
                size="sm"
                aria-label="Menu de gestion"
                style={{ opacity: 0.6 }}
              >
                <MoreVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item 
                icon={<Settings size={16} />}
                onClick={() => navigate('/admin/cash-registers')}
              >
                Gestion des postes de caisse
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
      {/* B50-P4: Vérifier si l'utilisateur a accès à au moins une caisse */}
      {!canAccessRealCash && !canAccessVirtual && !canAccessDeferred && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Vous n'avez pas accès à aucune caisse. Contactez un administrateur pour obtenir les permissions nécessaires.
          </Text>
        </Card>
      )}
      <SimpleGrid cols={3} spacing="lg" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        {/* B50-P4: Afficher seulement les caisses réelles si l'utilisateur a la permission caisse.access */}
        {canAccessRealCash && registers.map(reg => (
          <RegisterCard key={reg.id} reg={reg} onOpen={handleOpen} onResume={handleResume} />
        ))}
        {/* B50-P4: Carte Caisse Virtuelle - affichée si au moins une caisse a enable_virtual=true ET l'utilisateur a la permission caisse.virtual.access */}
        {hasVirtualEnabled && canAccessVirtual && (
        <Card 
          shadow="sm" 
          padding="lg" 
          radius="md" 
          withBorder
          style={{ 
            borderStyle: 'dashed',
            borderColor: '#868e96',
            backgroundColor: '#f8f9fa'
          }}
        >
          <Group position="apart" mb="xs">
            <Group spacing="xs">
              <PlayCircle size={20} color="#868e96" />
              <Title order={4} c="dimmed">Caisse Virtuelle</Title>
            </Group>
            <Badge color="blue" variant="light">Simulation</Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Mode d'entraînement sans impact sur les données réelles
          </Text>
          {/* B49-P3: Affichage caisse source pour traçabilité */}
          <Text size="xs" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
            Hérite des options de workflow de la caisse source sélectionnée
          </Text>
          <Group position="right">
            <Button 
              color="blue" 
              variant="light"
              onClick={handleVirtualCashRegister}
              leftSection={<PlayCircle size={16} />}
            >
              Simuler
            </Button>
          </Group>
        </Card>
        )}
        
        {/* B50-P4: Carte Saisie Différée - affichée si au moins une caisse a enable_deferred=true ET l'utilisateur a la permission caisse.deferred.access */}
        {hasDeferredEnabled && canAccessDeferred && (
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder
            style={{ 
              borderStyle: 'solid',
              borderColor: '#fbbf24',
              backgroundColor: '#fffbeb'
            }}
          >
            <Group position="apart" mb="xs">
              <Group spacing="xs">
                <Calendar size={20} color="#fbbf24" />
                <Title order={4} style={{ color: '#92400e' }}>Saisie différée</Title>
              </Group>
              <Badge color="orange" variant="light" size="sm">ADMIN</Badge>
            </Group>
            <Text size="sm" c="dimmed" mb="sm">
              Saisir des ventes d'anciens cahiers avec leur date réelle de vente
            </Text>
            {/* B49-P3: Affichage caisse source pour traçabilité */}
            <Text size="xs" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
              Hérite des options de workflow de la caisse source sélectionnée
            </Text>
            <Group position="right">
              <Button 
                color="orange" 
                variant="subtle"
                onClick={handleDeferredCashRegister}
                leftSection={<Calendar size={16} />}
                style={{ 
                  color: '#92400e',
                  borderColor: '#fbbf24'
                }}
              >
                Accéder
              </Button>
            </Group>
          </Card>
        )}
      </SimpleGrid>
    </Container>
  );
};

export default CashRegisterDashboard;


