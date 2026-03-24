/**
 * Données mockées pour la simulation de caisse virtuelle
 * Représente un catalogue réaliste d'articles de ressourcerie
 */

export interface VirtualCategory {
  id: string;
  name: string;
  is_active: boolean;
  is_visible: boolean;
  display_order: number;
  subcategories?: VirtualSubcategory[];
}

export interface VirtualSubcategory {
  id: string;
  name: string;
  category_id: string;
}

export interface VirtualPreset {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  weight?: number;
  description?: string;
}

// Catégories mockées typiques d'une ressourcerie
export const mockCategories: VirtualCategory[] = [
  {
    id: 'cat-electromenager',
    name: 'Électroménager',
    is_active: true,
    is_visible: true,
    display_order: 1,
    subcategories: [
      { id: 'sub-lavage', name: 'Lavage', category_id: 'cat-electromenager' },
      { id: 'sub-cuisson', name: 'Cuisson', category_id: 'cat-electromenager' },
      { id: 'sub-froid', name: 'Froid', category_id: 'cat-electromenager' }
    ]
  },
  {
    id: 'cat-informatique',
    name: 'Informatique',
    is_active: true,
    is_visible: true,
    display_order: 2,
    subcategories: [
      { id: 'sub-ordinateurs', name: 'Ordinateurs', category_id: 'cat-informatique' },
      { id: 'sub-peripheriques', name: 'Périphériques', category_id: 'cat-informatique' },
      { id: 'sub-telephonie', name: 'Téléphonie', category_id: 'cat-informatique' }
    ]
  },
  {
    id: 'cat-meubles',
    name: 'Meubles',
    is_active: true,
    is_visible: true,
    display_order: 3,
    subcategories: [
      { id: 'sub-salon', name: 'Salon', category_id: 'cat-meubles' },
      { id: 'sub-chambre', name: 'Chambre', category_id: 'cat-meubles' },
      { id: 'sub-cuisine', name: 'Cuisine', category_id: 'cat-meubles' }
    ]
  },
  {
    id: 'cat-decoration',
    name: 'Décoration',
    is_active: true,
    is_visible: true,
    display_order: 4,
    subcategories: [
      { id: 'sub-luminaire', name: 'Luminaire', category_id: 'cat-decoration' },
      { id: 'sub-objets', name: 'Objets décoratifs', category_id: 'cat-decoration' }
    ]
  },
  {
    id: 'cat-vetements',
    name: 'Vêtements',
    is_active: true,
    is_visible: true,
    display_order: 5,
    subcategories: [
      { id: 'sub-homme', name: 'Homme', category_id: 'cat-vetements' },
      { id: 'sub-femme', name: 'Femme', category_id: 'cat-vetements' },
      { id: 'sub-enfant', name: 'Enfant', category_id: 'cat-vetements' }
    ]
  },
  {
    id: 'cat-loisirs',
    name: 'Loisirs & Sports',
    is_active: true,
    is_visible: true,
    display_order: 6,
    subcategories: [
      { id: 'sub-jouets', name: 'Jouets', category_id: 'cat-loisirs' },
      { id: 'sub-sport', name: 'Sport', category_id: 'cat-loisirs' },
      { id: 'sub-loisirs', name: 'Loisirs créatifs', category_id: 'cat-loisirs' }
    ]
  }
];

// Presets mockés avec des prix réalistes
export const mockPresets: VirtualPreset[] = [
  // Électroménager - Lavage
  {
    id: 'preset-lave-linge',
    name: 'Lave-linge 6kg',
    category: 'cat-electromenager',
    subcategory: 'sub-lavage',
    price: 150,
    weight: 50,
    description: 'Lave-linge en bon état'
  },
  {
    id: 'preset-lave-vaisselle',
    name: 'Lave-vaisselle',
    category: 'cat-electromenager',
    subcategory: 'sub-lavage',
    price: 120,
    weight: 35,
    description: 'Lave-vaisselle compact'
  },
  {
    id: 'preset-seche-linge',
    name: 'Sèche-linge',
    category: 'cat-electromenager',
    subcategory: 'sub-lavage',
    price: 80,
    weight: 25,
    description: 'Sèche-linge mural'
  },

  // Électroménager - Cuisson
  {
    id: 'preset-four',
    name: 'Four électrique',
    category: 'cat-electromenager',
    subcategory: 'sub-cuisson',
    price: 100,
    weight: 30,
    description: 'Four encastrable'
  },
  {
    id: 'preset-micro-onde',
    name: 'Micro-ondes',
    category: 'cat-electromenager',
    subcategory: 'sub-cuisson',
    price: 25,
    weight: 12,
    description: 'Micro-ondes 20L'
  },

  // Informatique - Ordinateurs
  {
    id: 'preset-pc-portable',
    name: 'PC portable',
    category: 'cat-informatique',
    subcategory: 'sub-ordinateurs',
    price: 200,
    weight: 2.5,
    description: 'Ordinateur portable reconditionné'
  },
  {
    id: 'preset-pc-fixe',
    name: 'Unité centrale',
    category: 'cat-informatique',
    subcategory: 'sub-ordinateurs',
    price: 80,
    weight: 8,
    description: 'Tour d\'ordinateur'
  },

  // Informatique - Périphériques
  {
    id: 'preset-ecran',
    name: 'Écran 22"',
    category: 'cat-informatique',
    subcategory: 'sub-peripheriques',
    price: 45,
    weight: 3,
    description: 'Écran LCD 22 pouces'
  },
  {
    id: 'preset-clavier',
    name: 'Clavier + souris',
    category: 'cat-informatique',
    subcategory: 'sub-peripheriques',
    price: 10,
    weight: 0.5,
    description: 'Set clavier et souris USB'
  },

  // Meubles - Salon
  {
    id: 'preset-table-basse',
    name: 'Table basse',
    category: 'cat-meubles',
    subcategory: 'sub-salon',
    price: 35,
    weight: 15,
    description: 'Table basse en bois'
  },
  {
    id: 'preset-fauteuil',
    name: 'Fauteuil',
    category: 'cat-meubles',
    subcategory: 'sub-salon',
    price: 25,
    weight: 12,
    description: 'Fauteuil tissu'
  },

  // Décoration - Luminaire
  {
    id: 'preset-lampe',
    name: 'Lampe de bureau',
    category: 'cat-decoration',
    subcategory: 'sub-luminaire',
    price: 15,
    weight: 2,
    description: 'Lampe LED de bureau'
  },

  // Vêtements - Femme
  {
    id: 'preset-manteau-femme',
    name: 'Manteau femme',
    category: 'cat-vetements',
    subcategory: 'sub-femme',
    price: 12,
    weight: 0.8,
    description: 'Manteau d\'hiver'
  },
  {
    id: 'preset-pantalon-femme',
    name: 'Pantalon femme',
    category: 'cat-vetements',
    subcategory: 'sub-femme',
    price: 8,
    weight: 0.4,
    description: 'Jean ou pantalon'
  },

  // Loisirs - Jouets
  {
    id: 'preset-peluche',
    name: 'Peluche',
    category: 'cat-loisirs',
    subcategory: 'sub-jouets',
    price: 5,
    weight: 0.3,
    description: 'Jouet en peluche'
  }
];

// Scénarios d'entraînement prédéfinis
export const mockTrainingScenarios = {
  'scenario-debutant': {
    name: 'Débutant - Ventes simples',
    description: 'Apprendre les bases : articles simples, calculs élémentaires',
    items: [
      { presetId: 'preset-lampe', quantity: 1 },
      { presetId: 'preset-clavier', quantity: 1 },
      { presetId: 'preset-pantalon-femme', quantity: 2 }
    ]
  },
  'scenario-intermediaire': {
    name: 'Intermédiaire - Mix produits',
    description: 'Ventes avec différents types d\'articles et calculs',
    items: [
      { presetId: 'preset-pc-portable', quantity: 1 },
      { presetId: 'preset-ecran', quantity: 1 },
      { presetId: 'preset-table-basse', quantity: 1 },
      { presetId: 'preset-manteau-femme', quantity: 1 }
    ]
  },
  'scenario-expert': {
    name: 'Expert - Vente complexe',
    description: 'Gestion d\'une vente avec nombreux articles et don',
    items: [
      { presetId: 'preset-lave-linge', quantity: 1 },
      { presetId: 'preset-four', quantity: 1 },
      { presetId: 'preset-pc-portable', quantity: 1 },
      { presetId: 'preset-fauteuil', quantity: 2 },
      { presetId: 'preset-lampe', quantity: 3 }
    ],
    donation: 5.00
  }
};

// Fonction helper pour obtenir un preset par ID
export const getMockPresetById = (id: string): VirtualPreset | undefined => {
  return mockPresets.find(preset => preset.id === id);
};

// Fonction helper pour obtenir une catégorie par ID
export const getMockCategoryById = (id: string): VirtualCategory | undefined => {
  return mockCategories.find(category => category.id === id);
};

// Fonction helper pour obtenir les presets d'une catégorie
export const getMockPresetsByCategory = (categoryId: string): VirtualPreset[] => {
  return mockPresets.filter(preset => preset.category === categoryId);
};

// Fonction helper pour obtenir les catégories actives/visibles
export const getMockActiveCategories = (): VirtualCategory[] => {
  return mockCategories.filter(cat => cat.is_active && cat.is_visible);
};















