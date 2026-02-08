/**
 * Pre-Migration Validation Script
 *
 * Validates Firebase data integrity before migration to Supabase.
 * Run this script to identify and fix issues before exporting data.
 *
 * Usage:
 *   npx tsx scripts/validate-firebase-data.ts
 *
 * Requirements:
 *   - Firebase service account key file at ./firebase-service-account.json
 *   - Or set GOOGLE_APPLICATION_CREDENTIALS environment variable
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Types for Firebase documents
interface PersonDB {
  name: string;
  owner: string;
  access: string[];
  location?: string;
  parents?: string[];
  children?: string[];
  siblings?: string[];
  partners?: string[];
  relatives?: Record<string, string[]>;
}

interface PlaceDB {
  name: string;
  owner: string;
  access: string[];
  parentId?: string;
}

interface QuestDB {
  name: string;
  owner: string;
  access: string[];
  parentId?: string;
}

interface FlowDB {
  title?: string;
  owner: string;
  access: string[];
  items: FlowItemDB[];
}

interface FlowItemDB {
  id: string;
  type: 'person' | 'place' | 'quest' | 'note';
  personId?: string;
  placeId?: string;
  questId?: string;
  noteId?: string;
}

interface CombatantDB {
  name?: string;
  person?: string;
  active: boolean;
  initiative: number;
}

interface ValidationResult {
  category: string;
  severity: 'error' | 'warning';
  message: string;
  documentId?: string;
  documentName?: string;
  details?: Record<string, unknown>;
}

class FirebaseValidator {
  private db: admin.firestore.Firestore;
  private results: ValidationResult[] = [];

  // Cached collections
  private users: Map<string, { id: string; name: string; isGM: boolean }> = new Map();
  private people: Map<string, PersonDB & { id: string }> = new Map();
  private places: Map<string, PlaceDB & { id: string }> = new Map();
  private quests: Map<string, QuestDB & { id: string }> = new Map();
  private notes: Map<string, { id: string }> = new Map();
  private flows: Map<string, FlowDB & { id: string }> = new Map();

  constructor() {
    // Initialize Firebase Admin
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      throw new Error(
        'Firebase credentials not found. Please provide:\n' +
        '  - firebase-service-account.json file in project root, OR\n' +
        '  - GOOGLE_APPLICATION_CREDENTIALS environment variable'
      );
    }

    this.db = admin.firestore();
  }

  private addResult(result: Omit<ValidationResult, 'category'> & { category: string }) {
    this.results.push(result);
  }

  async loadCollections(): Promise<void> {
    console.log('Loading collections from Firebase...\n');

    // Load users
    const usersSnap = await this.db.collection('users').get();
    usersSnap.forEach((doc) => {
      const data = doc.data();
      this.users.set(doc.id, {
        id: doc.id,
        name: data.name || 'Unknown',
        isGM: data.isGM || false,
      });
    });
    console.log(`  Users: ${this.users.size}`);

    // Load people
    const peopleSnap = await this.db.collection('people').get();
    peopleSnap.forEach((doc) => {
      this.people.set(doc.id, { id: doc.id, ...doc.data() } as PersonDB & { id: string });
    });
    console.log(`  People: ${this.people.size}`);

    // Load places
    const placesSnap = await this.db.collection('places').get();
    placesSnap.forEach((doc) => {
      this.places.set(doc.id, { id: doc.id, ...doc.data() } as PlaceDB & { id: string });
    });
    console.log(`  Places: ${this.places.size}`);

    // Load quests
    const questsSnap = await this.db.collection('quests').get();
    questsSnap.forEach((doc) => {
      this.quests.set(doc.id, { id: doc.id, ...doc.data() } as QuestDB & { id: string });
    });
    console.log(`  Quests: ${this.quests.size}`);

    // Load notes
    const notesSnap = await this.db.collection('notes').get();
    notesSnap.forEach((doc) => {
      this.notes.set(doc.id, { id: doc.id });
    });
    console.log(`  Notes: ${this.notes.size}`);

    // Load flows
    const flowsSnap = await this.db.collection('flows').get();
    flowsSnap.forEach((doc) => {
      this.flows.set(doc.id, { id: doc.id, ...doc.data() } as FlowDB & { id: string });
    });
    console.log(`  Flows: ${this.flows.size}`);

    console.log('');
  }

  async validateOrphanedLocationReferences(): Promise<void> {
    console.log('Checking orphaned location references (people -> places)...');

    for (const [personId, person] of this.people) {
      if (person.location && !this.places.has(person.location)) {
        this.addResult({
          category: 'Orphaned Location',
          severity: 'error',
          message: `Person "${person.name}" references non-existent place`,
          documentId: personId,
          documentName: person.name,
          details: { locationId: person.location },
        });
      }
    }
  }

  async validateOrphanedPlaceParentReferences(): Promise<void> {
    console.log('Checking orphaned parent references (places -> places)...');

    for (const [placeId, place] of this.places) {
      if (place.parentId && typeof place.parentId === 'string' && !this.places.has(place.parentId)) {
        this.addResult({
          category: 'Orphaned Place Parent',
          severity: 'error',
          message: `Place "${place.name}" references non-existent parent`,
          documentId: placeId,
          documentName: place.name,
          details: { parentId: place.parentId },
        });
      }
    }
  }

  async validateOrphanedQuestParentReferences(): Promise<void> {
    console.log('Checking orphaned parent references (quests -> quests)...');

    for (const [questId, quest] of this.quests) {
      if (quest.parentId && typeof quest.parentId === 'string' && !this.quests.has(quest.parentId)) {
        this.addResult({
          category: 'Orphaned Quest Parent',
          severity: 'error',
          message: `Quest "${quest.name}" references non-existent parent`,
          documentId: questId,
          documentName: quest.name,
          details: { parentId: quest.parentId },
        });
      }
    }
  }

  async validateCircularPlaceHierarchies(): Promise<void> {
    console.log('Checking circular hierarchies in places...');

    for (const [placeId, place] of this.places) {
      const visited = new Set<string>();
      let currentId: string | undefined = placeId;

      while (currentId) {
        if (visited.has(currentId)) {
          this.addResult({
            category: 'Circular Place Hierarchy',
            severity: 'error',
            message: `Place "${place.name}" is part of a circular parent chain`,
            documentId: placeId,
            documentName: place.name,
            details: { chain: Array.from(visited) },
          });
          break;
        }

        visited.add(currentId);
        const current = this.places.get(currentId);
        currentId = current?.parentId && typeof current.parentId === 'string' ? current.parentId : undefined;
      }
    }
  }

  async validateCircularQuestHierarchies(): Promise<void> {
    console.log('Checking circular hierarchies in quests...');

    for (const [questId, quest] of this.quests) {
      const visited = new Set<string>();
      let currentId: string | undefined = questId;

      while (currentId) {
        if (visited.has(currentId)) {
          this.addResult({
            category: 'Circular Quest Hierarchy',
            severity: 'error',
            message: `Quest "${quest.name}" is part of a circular parent chain`,
            documentId: questId,
            documentName: quest.name,
            details: { chain: Array.from(visited) },
          });
          break;
        }

        visited.add(currentId);
        const current = this.quests.get(currentId);
        currentId = current?.parentId && typeof current.parentId === 'string' ? current.parentId : undefined;
      }
    }
  }

  async validateAccessArrays(): Promise<void> {
    console.log('Checking invalid access arrays (references to deleted users)...');

    const validateAccess = (
      collection: string,
      items: Map<string, { id: string; name?: string; access: string[] }>
    ) => {
      for (const [docId, doc] of items) {
        if (!doc.access) continue;

        const invalidUsers = doc.access.filter((userId) => !this.users.has(userId));
        if (invalidUsers.length > 0) {
          this.addResult({
            category: 'Invalid Access Array',
            severity: 'warning',
            message: `${collection} "${doc.name || docId}" has ${invalidUsers.length} invalid user reference(s)`,
            documentId: docId,
            documentName: doc.name,
            details: { invalidUserIds: invalidUsers },
          });
        }
      }
    };

    validateAccess('Person', this.people as unknown as Map<string, { id: string; name?: string; access: string[] }>);
    validateAccess('Place', this.places as unknown as Map<string, { id: string; name?: string; access: string[] }>);
    validateAccess('Quest', this.quests as unknown as Map<string, { id: string; name?: string; access: string[] }>);
    validateAccess('Flow', this.flows as unknown as Map<string, { id: string; name?: string; access: string[] }>);
  }

  async validateOrphanedFlowItems(): Promise<void> {
    console.log('Checking orphaned flow items (references to deleted entities)...');

    for (const [flowId, flow] of this.flows) {
      if (!flow.items) continue;

      for (const item of flow.items) {
        let isOrphaned = false;
        let referencedId: string | undefined;
        let entityType: string = item.type;

        switch (item.type) {
          case 'person':
            referencedId = item.personId;
            isOrphaned = !!referencedId && !this.people.has(referencedId);
            break;
          case 'place':
            referencedId = item.placeId;
            isOrphaned = !!referencedId && !this.places.has(referencedId);
            break;
          case 'quest':
            referencedId = item.questId;
            isOrphaned = !!referencedId && !this.quests.has(referencedId);
            break;
          case 'note':
            referencedId = item.noteId;
            isOrphaned = !!referencedId && !this.notes.has(referencedId);
            break;
        }

        if (isOrphaned) {
          this.addResult({
            category: 'Orphaned Flow Item',
            severity: 'error',
            message: `Flow "${flow.title || flowId}" has item referencing deleted ${entityType}`,
            documentId: flowId,
            documentName: flow.title,
            details: { itemId: item.id, entityType, referencedId },
          });
        }
      }
    }
  }

  async validateOrphanedPersonRelationships(): Promise<void> {
    console.log('Checking orphaned person relationships...');

    for (const [personId, person] of this.people) {
      const checkRelationships = (relationName: string, ids: string[] | undefined) => {
        if (!ids) return;
        for (const relatedId of ids) {
          if (!this.people.has(relatedId)) {
            this.addResult({
              category: 'Orphaned Person Relationship',
              severity: 'warning',
              message: `Person "${person.name}" has ${relationName} referencing deleted person`,
              documentId: personId,
              documentName: person.name,
              details: { relationshipType: relationName, referencedId: relatedId },
            });
          }
        }
      };

      checkRelationships('parent', person.parents);
      checkRelationships('child', person.children);
      checkRelationships('sibling', person.siblings);
      checkRelationships('partner', person.partners);

      // Check relatives (Record<string, string[]>)
      if (person.relatives) {
        for (const [relationType, ids] of Object.entries(person.relatives)) {
          checkRelationships(`relative (${relationType})`, ids);
        }
      }
    }
  }

  async validateCombatants(): Promise<void> {
    console.log('Checking combatants referencing deleted people...');

    // Combat has a specific hardcoded path in Firebase
    const combatPath = 'combat/tKthlBKLy0JuVaPnXWzY/fighters';

    try {
      const combatantsSnap = await this.db.collection(combatPath).get();

      combatantsSnap.forEach((doc) => {
        const combatant = doc.data() as CombatantDB;
        if (combatant.person && !this.people.has(combatant.person)) {
          this.addResult({
            category: 'Orphaned Combatant',
            severity: 'error',
            message: `Combatant "${combatant.name || doc.id}" references deleted person`,
            documentId: doc.id,
            documentName: combatant.name,
            details: { personId: combatant.person },
          });
        }
      });

      console.log(`  Checked ${combatantsSnap.size} combatants`);
    } catch (error) {
      console.log('  No combat data found (this is OK if combat feature not used)');
    }
  }

  async validateOwnerReferences(): Promise<void> {
    console.log('Checking owner references...');

    const validateOwner = (
      collection: string,
      items: Map<string, { id: string; name?: string; owner: string }>
    ) => {
      for (const [docId, doc] of items) {
        if (doc.owner && !this.users.has(doc.owner)) {
          this.addResult({
            category: 'Invalid Owner',
            severity: 'error',
            message: `${collection} "${doc.name || docId}" has invalid owner reference`,
            documentId: docId,
            documentName: doc.name,
            details: { ownerId: doc.owner },
          });
        }
      }
    };

    validateOwner('Person', this.people as unknown as Map<string, { id: string; name?: string; owner: string }>);
    validateOwner('Place', this.places as unknown as Map<string, { id: string; name?: string; owner: string }>);
    validateOwner('Quest', this.quests as unknown as Map<string, { id: string; name?: string; owner: string }>);
    validateOwner('Flow', this.flows as unknown as Map<string, { id: string; name?: string; owner: string }>);
  }

  async runAllValidations(): Promise<void> {
    await this.loadCollections();

    console.log('Running validations...\n');

    await this.validateOrphanedLocationReferences();
    await this.validateOrphanedPlaceParentReferences();
    await this.validateOrphanedQuestParentReferences();
    await this.validateCircularPlaceHierarchies();
    await this.validateCircularQuestHierarchies();
    await this.validateAccessArrays();
    await this.validateOrphanedFlowItems();
    await this.validateOrphanedPersonRelationships();
    await this.validateCombatants();
    await this.validateOwnerReferences();

    console.log('');
  }

  printResults(): void {
    console.log('='.repeat(80));
    console.log('VALIDATION RESULTS');
    console.log('='.repeat(80));

    if (this.results.length === 0) {
      console.log('\n✅ No issues found! Data is ready for migration.\n');
      return;
    }

    const errors = this.results.filter((r) => r.severity === 'error');
    const warnings = this.results.filter((r) => r.severity === 'warning');

    console.log(`\n❌ ${errors.length} error(s), ⚠️  ${warnings.length} warning(s)\n`);

    // Group by category
    const byCategory = new Map<string, ValidationResult[]>();
    for (const result of this.results) {
      const existing = byCategory.get(result.category) || [];
      existing.push(result);
      byCategory.set(result.category, existing);
    }

    for (const [category, results] of byCategory) {
      const errorCount = results.filter((r) => r.severity === 'error').length;
      const warningCount = results.filter((r) => r.severity === 'warning').length;

      console.log(`\n${category} (${errorCount} errors, ${warningCount} warnings)`);
      console.log('-'.repeat(60));

      for (const result of results.slice(0, 10)) {
        const icon = result.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.message}`);
        if (result.documentId) {
          console.log(`     ID: ${result.documentId}`);
        }
        if (result.details) {
          console.log(`     Details: ${JSON.stringify(result.details)}`);
        }
      }

      if (results.length > 10) {
        console.log(`  ... and ${results.length - 10} more`);
      }
    }

    console.log('\n' + '='.repeat(80));

    if (errors.length > 0) {
      console.log('\n⛔ BLOCKING: Fix errors before proceeding with migration.');
      console.log('   Errors indicate data that will cause foreign key violations.\n');
    } else if (warnings.length > 0) {
      console.log('\n⚠️  ADVISORY: Warnings indicate potential data quality issues.');
      console.log('   Migration can proceed, but review warnings for data cleanup.\n');
    }
  }

  getExitCode(): number {
    const errors = this.results.filter((r) => r.severity === 'error');
    return errors.length > 0 ? 1 : 0;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Firebase Pre-Migration Validation');
  console.log('='.repeat(80));
  console.log('');

  try {
    const validator = new FirebaseValidator();
    await validator.runAllValidations();
    validator.printResults();
    process.exit(validator.getExitCode());
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

main();
