import { describe, it, expect, beforeEach } from 'vitest';
import { saveRecipe, loadRecipes, deleteRecipe, SavedRecipe, clearRecipesForTesting } from '../../src/storage/db';
import { DEFAULT_MOD_MATRIX } from '../../src/rhythm/modmatrix';

describe('Storage / IndexedDB wrapper', () => {
  beforeEach(async () => {
    await clearRecipesForTesting();
  });

  it('saves and loads a custom user recipe', async () => {
    const testRecipe: SavedRecipe = {
      id: 'custom-1',
      name: 'Polyrhythmic Jazz',
      matrix: DEFAULT_MOD_MATRIX,
      voiceMap: { proton: 'kick', neutron: 'hat' },
    };

    await saveRecipe(testRecipe);
    const all = await loadRecipes();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('Polyrhythmic Jazz');
    expect(all[0].id).toBe('custom-1');
  });

  it('deletes a recipe by id', async () => {
    const testRecipe: SavedRecipe = {
      id: 'custom-2',
      name: 'To be deleted',
      matrix: DEFAULT_MOD_MATRIX,
      voiceMap: {},
    };

    await saveRecipe(testRecipe);
    let all = await loadRecipes();
    expect(all.length).toBe(1);

    await deleteRecipe('custom-2');
    all = await loadRecipes();
    expect(all.length).toBe(0);
  });
});
