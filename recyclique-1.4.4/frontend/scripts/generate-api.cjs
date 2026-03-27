#!/usr/bin/env node

/**
 * Script de génération de l'API TypeScript à partir de la spécification OpenAPI
 * Source lue par `npm run codegen`: `recyclique-1.4.4/openapi.json`.
 */

const fs = require('fs');
const path = require('path');

const OPENAPI_FILE = path.join(__dirname, '../../openapi.json');
const OUTPUT_DIR = path.join(__dirname, '../src/generated');

function generateApi() {
  console.log('🚀 Génération de l\'API TypeScript...');
  
  // Vérifier que le fichier OpenAPI existe
  if (!fs.existsSync(OPENAPI_FILE)) {
    console.error('❌ Fichier OpenAPI non trouvé:', OPENAPI_FILE);
    process.exit(1);
  }

  // Créer le répertoire de sortie s'il n'existe pas
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Lire le fichier OpenAPI
  const openApiSpec = JSON.parse(fs.readFileSync(OPENAPI_FILE, 'utf8'));
  
  console.log(`📊 Spécification OpenAPI chargée:`);
  console.log(`   - Titre: ${openApiSpec.info.title}`);
  console.log(`   - Version: ${openApiSpec.info.version}`);
  console.log(`   - Endpoints: ${Object.keys(openApiSpec.paths).length}`);
  console.log(`   - Schémas: ${Object.keys(openApiSpec.components?.schemas || {}).length}`);

  // Générer les types TypeScript
  generateTypes(openApiSpec);
  
  // Générer le client API
  generateApiClient(openApiSpec);
  
  // Générer l'index
  generateIndex();
  
  console.log('✅ Génération terminée !');
  console.log(`📁 Fichiers générés dans: ${OUTPUT_DIR}`);
}

function generateTypes(openApiSpec) {
  const schemas = openApiSpec.components?.schemas || {};
  const types = [];
  
  // Enums
  const enums = [];
  // Interfaces
  const interfaces = [];
  
  Object.entries(schemas).forEach(([name, schema]) => {
    if (schema.type === 'string' && schema.enum) {
      // C'est un enum
      enums.push(generateEnum(name, schema));
    } else if (schema.type === 'object') {
      // C'est une interface
      interfaces.push(generateInterface(name, schema));
    }
  });
  
  const content = [
    `/**`,
    ` * Types générés automatiquement à partir de la spécification OpenAPI`,
    ` * Source spec: recyclique-1.4.4/openapi.json`,
    ` * Généré le: ${new Date().toISOString()}`,
    ` */`,
    ``,
    `// ============================================================================`,
    `// ENUMS`,
    `// ============================================================================`,
    ``,
    ...enums,
    ``,
    `// ============================================================================`,
    `// INTERFACES`,
    `// ============================================================================`,
    ``,
    ...interfaces,
    ``,
    `// ============================================================================`,
    `// API RESPONSE TYPES`,
    `// ============================================================================`,
    ``,
    `export interface ApiResponse<T = any> {`,
    `  data: T;`,
    `  message?: string;`,
    `  success: boolean;`,
    `}`,
    ``,
    `export interface PaginatedResponse<T = any> {`,
    `  items: T[];`,
    `  total: number;`,
    `  page: number;`,
    `  size: number;`,
    `  pages: number;`,
    `}`,
    ``,
    `// ============================================================================`,
    `// ERROR TYPES`,
    `// ============================================================================`,
    ``,
    `export interface ApiError {`,
    `  detail: string;`,
    `  type?: string;`,
    `  code?: string;`,
    `}`,
    ``,
    `export interface ValidationError {`,
    `  loc: (string | number)[];`,
    `  msg: string;`,
    `  type: string;`,
    `}`,
  ].join('\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'types.ts'), content);
  console.log('✅ Types générés');
}

function generateEnum(name, schema) {
  const values = schema.enum.map(val => `  ${val.toUpperCase().replace(/-/g, '_')} = '${val}'`).join(',\n');
  return `export enum ${name} {\n${values}\n}`;
}

function generateInterface(name, schema) {
  // Échapper les caractères non valides pour les identifiants TypeScript
  const validName = name.replace(/[^a-zA-Z0-9_]/g, '_');

  const properties = schema.properties || {};
  const required = schema.required || [];

  const fields = Object.entries(properties).map(([fieldName, fieldSchema]) => {
    const isRequired = required.includes(fieldName);
    const optional = isRequired ? '' : '?';
    const type = getTypeScriptType(fieldSchema);
    return `  ${fieldName}${optional}: ${type};`;
  }).join('\n');

  return `export interface ${validName} {\n${fields}\n}`;
}

function getTypeScriptType(schema) {
  if (schema.type === 'string') {
    if (schema.enum) {
      return 'string'; // Les enums sont gérés séparément
    }
    return 'string';
  } else if (schema.type === 'integer' || schema.type === 'number') {
    return 'number';
  } else if (schema.type === 'boolean') {
    return 'boolean';
  } else if (schema.type === 'array') {
    const itemType = getTypeScriptType(schema.items || {});
    return `${itemType}[]`;
  } else if (schema.type === 'object') {
    return 'object';
  } else if (schema.anyOf) {
    // Union type
    const types = schema.anyOf.map(getTypeScriptType);
    return types.join(' | ');
  } else if (schema.$ref) {
    // Reference to another schema
    const refName = schema.$ref.split('/').pop();
    // Échapper les caractères non valides pour les identifiants TypeScript
    const validRefName = refName.replace(/[^a-zA-Z0-9_]/g, '_');
    return validRefName;
  }

  return 'any';
}

function generateApiClient(openApiSpec) {
  const paths = openApiSpec.paths || {};
  const apiClasses = [];
  
  // Grouper les endpoints par tag
  const endpointsByTag = {};
  
  Object.entries(paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const tags = operation.tags || ['default'];
      const tag = tags[0];
      
      if (!endpointsByTag[tag]) {
        endpointsByTag[tag] = [];
      }
      
      endpointsByTag[tag].push({
        path,
        method: method.toUpperCase(),
        operationId: operation.operationId,
        summary: operation.summary,
        parameters: operation.parameters || [],
        requestBody: operation.requestBody,
        responses: operation.responses || {}
      });
    });
  });
  
  // Générer les classes API
  Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
    // Transformer le tag en nom de classe valide (PascalCase)
    const className = `${tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Api`;
    const methods = endpoints.map(endpoint => generateApiMethod(endpoint)).join('\n\n  ');
    
    apiClasses.push(`export class ${className} {
  ${methods}
}`);
  });
  
  const content = [
    `/**`,
    ` * Client API généré automatiquement à partir de la spécification OpenAPI`,
    ` * Source spec: recyclique-1.4.4/openapi.json`,
    ` * Généré le: ${new Date().toISOString()}`,
    ` */`,
    ``,
    `import type { AxiosResponse } from 'axios';`,
    `import apiClient from '../api/axiosClient';`,
    `import {`,
    `  UserResponse,`,
    `  UserCreate,`,
    `  UserUpdate,`,
    `  UserRoleUpdate,`,
    `  UserStatusUpdate,`,
    `  ApiResponse,`,
    `  PaginatedResponse,`,
    `  ApiError`,
    `} from './types';`,
    ``,
    `// Utilise l'instance centralisée axiosClient`,
    `// ============================================================================`,
    `// API CLASSES`,
    `// ============================================================================`,
    ``,
    ...apiClasses,
    ``,
    `// ============================================================================`,
    `// EXPORT PAR DÉFAUT`,
    `// ============================================================================`,
    ``,
    `export default {`,
    `  client: apiClient`,
    `};`,
  ].join('\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'api.ts'), content);
  console.log('✅ Client API généré');
}

function generateApiMethod(endpoint) {
  const { operationId, summary, method, path, parameters, requestBody, responses } = endpoint;
  
  // Extraire les paramètres de path
  const pathParams = parameters.filter(p => p.in === 'path').map(p => p.name);
  const queryParams = parameters.filter(p => p.in === 'query');
  
  // Déterminer le type de retour
  const successResponse = responses['200'] || responses['201'] || responses['202'];
  let returnType = 'any';
  if (successResponse?.content?.['application/json']?.schema) {
    const schema = successResponse.content['application/json'].schema;
    if (schema.type === 'array' && schema.items?.$ref) {
      const itemType = schema.items.$ref.split('/').pop();
      returnType = `${itemType}[]`;
    } else if (schema.$ref) {
      returnType = schema.$ref.split('/').pop();
    }
  }
  
  // Générer la signature de la méthode
  const methodName = operationId.replace(/^[^_]+_/, '').replace(/_/g, '');
  const pathParamsStr = pathParams.length > 0 ? pathParams.join(', ') : '';
  const queryParamsStr = queryParams.length > 0 ? 'params?: any' : '';
  const bodyParam = requestBody ? 'data?: any' : '';
  
  const params = [pathParamsStr, queryParamsStr, bodyParam].filter(Boolean).join(', ');
  
  // Générer l'URL avec les paramètres
  let url = path;
  pathParams.forEach(param => {
    url = url.replace(`{${param}}`, `\${${param}}`);
  });
  
  // Ajouter les paramètres de query
  const queryString = queryParams.length > 0 ? '?${new URLSearchParams(params).toString()}' : '';
  
  return `  /**
   * ${summary || operationId}
   */
  static async ${methodName}(${params}): Promise<${returnType}> {
    const response: AxiosResponse<${returnType}> = await apiClient.${method.toLowerCase()}(\`${url}${queryString}\`${bodyParam ? ', data' : ''});
    return response.data;
  }`;
}

function generateIndex() {
  const content = [
    `/**`,
    ` * Point d'entrée pour les types et l'API générés`,
    ` * Source spec: recyclique-1.4.4/openapi.json`,
    ` * Généré le: ${new Date().toISOString()}`,
    ` */`,
    ``,
    `// Export des types`,
    `export * from './types';`,
    ``,
    `// Export de l'API`,
    `export * from './api';`,
    ``,
    `// Export par défaut`,
    `export { default as ApiClient } from './api';`,
  ].join('\n');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), content);
  console.log('✅ Index généré');
}

// Exécuter la génération
generateApi();
