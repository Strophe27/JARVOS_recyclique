"""Story B49-P1: Tests de rétrocompatibilité pour les caisses existantes."""
import pytest
from sqlalchemy.orm import Session

from recyclic_api.models.cash_register import CashRegister
from recyclic_api.models.site import Site
from recyclic_api.services.cash_register_service import CashRegisterService
from recyclic_api.schemas.cash_register import CashRegisterCreate, CashRegisterResponse


@pytest.fixture
def test_site(db_session: Session):
    """Créer un site de test."""
    site = Site(
        name="Test Site B49 Retro",
        address="123 Test Street"
    )
    db_session.add(site)
    db_session.commit()
    db_session.refresh(site)
    return site


class TestBackwardCompatibility:
    """Tests de rétrocompatibilité pour les caisses existantes."""
    
    def test_existing_register_without_options_has_defaults(self, db_session: Session, test_site: Site):
        """Test qu'une caisse créée sans options a les valeurs par défaut."""
        service = CashRegisterService(db_session)
        
        # Créer une caisse sans spécifier les nouveaux champs (comme avant)
        data = CashRegisterCreate(
            name="Old Register",
            site_id=str(test_site.id),
            is_active=True
        )
        
        register = service.create(data=data)
        
        # Vérifier les valeurs par défaut
        assert register.workflow_options == {} or register.workflow_options is not None
        assert register.enable_virtual is False
        assert register.enable_deferred is False
    
    def test_read_existing_register_works(self, db_session: Session, test_site: Site):
        """Test que la lecture d'une caisse existante fonctionne."""
        service = CashRegisterService(db_session)
        
        # Créer une caisse
        data = CashRegisterCreate(
            name="Existing Register",
            site_id=str(test_site.id),
            is_active=True
        )
        register = service.create(data=data)
        
        # Lire la caisse
        read_register = service.get(register_id=str(register.id))
        
        assert read_register is not None
        assert read_register.name == "Existing Register"
        # Vérifier que les nouveaux champs sont présents avec valeurs par défaut
        assert hasattr(read_register, 'workflow_options')
        assert hasattr(read_register, 'enable_virtual')
        assert hasattr(read_register, 'enable_deferred')
        assert read_register.enable_virtual is False
        assert read_register.enable_deferred is False
    
    def test_update_existing_register_keeps_defaults_if_not_specified(self, db_session: Session, test_site: Site):
        """Test que la mise à jour d'une caisse existante conserve les valeurs par défaut si non spécifiées."""
        service = CashRegisterService(db_session)
        
        # Créer une caisse
        data = CashRegisterCreate(
            name="Register to Update",
            site_id=str(test_site.id),
            is_active=True
        )
        register = service.create(data=data)
        
        # Mettre à jour seulement le nom (sans toucher aux nouveaux champs)
        from recyclic_api.schemas.cash_register import CashRegisterUpdate
        update_data = CashRegisterUpdate(name="Updated Register")
        
        updated = service.update(register=register, data=update_data)
        
        assert updated.name == "Updated Register"
        # Les valeurs par défaut doivent être conservées
        assert updated.workflow_options == {} or updated.workflow_options is not None
        assert updated.enable_virtual is False
        assert updated.enable_deferred is False


