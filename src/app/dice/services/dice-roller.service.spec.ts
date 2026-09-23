import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DiceRollerService } from './dice-roller.service';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { RulesService } from '../../rules/services/rules.service';
import { RealtimeService } from '../../core/services/supabase-realtime.service';
import { RollType } from '../enums/roll-type.enum';
import {
  createMockAuthService,
  createMockDataService,
  createMockRealtimeService,
} from '../../testing/supabase-test-helpers';

describe('DiceRollerService', () => {
  let service: DiceRollerService;
  let mockData: ReturnType<typeof createMockDataService>;
  let mockRealtime: ReturnType<typeof createMockRealtimeService>;

  beforeEach(() => {
    const mockAuth = createMockAuthService();
    mockData = createMockDataService();
    mockRealtime = createMockRealtimeService();
    const mockRules = {
      getRulesConfig: jasmine.createSpy('getRulesConfig').and.returnValue(
        Promise.resolve({ edition: 5, allowedAttributes: [] })
      ),
      getDynamicRules: jasmine.createSpy('getDynamicRules').and.returnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        DiceRollerService,
        { provide: AuthService, useValue: mockAuth },
        { provide: DataService, useValue: mockData },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: RulesService, useValue: mockRules },
      ],
    });
    service = TestBed.inject(DiceRollerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateSkillCheck()', () => {
    it('should return positive skill points when all rolls pass', () => {
      const result = service.validateSkillCheck({
        attributes: [14, 14, 14],
        rolls: [10, 10, 10],
        skillPoints: 8,
        modifier: 0,
      });
      expect(result).toBe(8);
    });

    it('should spend skill points when rolls exceed attributes', () => {
      const result = service.validateSkillCheck({
        attributes: [12, 12, 12],
        rolls: [14, 14, 12],
        skillPoints: 8,
        modifier: 0,
      });
      // Rolls exceed by 2+2=4, so 8-4=4
      expect(result).toBe(4);
    });

    it('should return 1 when skill points just barely cover excess', () => {
      const result = service.validateSkillCheck({
        attributes: [10, 10, 10],
        rolls: [10, 10, 10],
        skillPoints: 5,
        modifier: 0,
      });
      expect(result).toBe(5);
    });

    it('should handle negative effective skill (modifier > skillPoints)', () => {
      const result = service.validateSkillCheck({
        attributes: [14, 14, 14],
        rolls: [10, 10, 10],
        skillPoints: 2,
        modifier: 5,
      });
      // effectiveSkill = 2-5 = -3, attributes reduced to 11,11,11
      // rolls 10<11, 10<11, 10<11 => all pass => netSkill=1
      expect(result).toBe(1);
    });

    it('should return negative when roll fails completely', () => {
      const result = service.validateSkillCheck({
        attributes: [10, 10, 10],
        rolls: [20, 20, 20],
        skillPoints: 5,
        modifier: 0,
      });
      // Excess: 10+10+10=30, 5-30=-25
      expect(result).toBeLessThan(0);
    });

    it('should cap net skill at skillPoints', () => {
      const result = service.validateSkillCheck({
        attributes: [20, 20, 20],
        rolls: [1, 1, 1],
        skillPoints: 3,
        modifier: 0,
      });
      expect(result).toBe(3);
    });

    it('should return 1 when netSkill is exactly 0', () => {
      const result = service.validateSkillCheck({
        attributes: [10, 10, 10],
        rolls: [13, 13, 14],
        skillPoints: 10,
        modifier: 0,
      });
      // Excess: 3+3+4=10, 10-10=0 => treated as 1
      expect(result).toBe(1);
    });
  });

  describe('validateSkill5Check()', () => {
    it('should return full skill points when all rolls pass', () => {
      const result = service.validateSkill5Check({
        attributes: [14, 14, 14],
        rolls: [10, 10, 10],
        skillPoints: 8,
        modifier: 0,
      });
      expect(result).toBe(8);
    });

    it('should add modifier to attributes (not subtract from skill)', () => {
      const result = service.validateSkill5Check({
        attributes: [10, 10, 10],
        rolls: [13, 13, 13],
        skillPoints: 5,
        modifier: 3,
      });
      // effective attrs = 13,13,13; rolls exactly match => no excess
      expect(result).toBe(5);
    });

    it('should reduce skill points by excess roll over effective attribute', () => {
      const result = service.validateSkill5Check({
        attributes: [12, 12, 12],
        rolls: [15, 12, 12],
        skillPoints: 10,
        modifier: 0,
      });
      // Excess on first: 15-12=3, others pass => 10-3=7
      expect(result).toBe(7);
    });

    it('should go negative when excess exceeds skill points', () => {
      const result = service.validateSkill5Check({
        attributes: [10, 10, 10],
        rolls: [20, 20, 20],
        skillPoints: 5,
        modifier: 0,
      });
      // Excess: 10+10+10=30, 5-30=-25
      expect(result).toBe(-25);
    });
  });

  describe('getRecentRolls()', () => {
    it('should call realtime.watch for rolls table', () => {
      service.getRecentRolls().subscribe();
      expect(mockRealtime.watch).toHaveBeenCalledWith(
        'rolls',
        jasmine.any(Function),
        'rolls',
      );
    });

    it('should transform attribute roll rows', (done) => {
      service.getRecentRolls().subscribe(rolls => {
        if (rolls.length === 0) return;
        expect(rolls[0].type).toBe(RollType.Attribute);
        expect((rolls[0] as any).attribute).toBe(14);
        expect((rolls[0] as any).roll).toBe(11);
        expect((rolls[0] as any).modifier).toBe(0);
        expect(rolls[0].owner).toBe('u1');
        done();
      });

      mockRealtime.emitRows('rolls', [{
        type: RollType.Attribute,
        attribute: 14,
        roll: 11,
        modifier: 0,
        name: 'Courage',
        owner_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      }]);
    });

    it('should transform damage roll rows', (done) => {
      service.getRecentRolls().subscribe(rolls => {
        if (rolls.length === 0) return;
        expect(rolls[0].type).toBe(RollType.Damage);
        expect((rolls[0] as any).rolls).toEqual([3, 5]);
        expect((rolls[0] as any).diceType).toBe(6);
        done();
      });

      mockRealtime.emitRows('rolls', [{
        type: RollType.Damage,
        dice_rolls: [3, 5],
        dice_type: '6',
        modifier: 2,
        owner_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      }]);
    });

    it('should transform skill roll rows', (done) => {
      service.getRecentRolls().subscribe(rolls => {
        if (rolls.length === 0) return;
        expect(rolls[0].type).toBe(RollType.Skill);
        expect((rolls[0] as any).attributes).toEqual([14, 13, 12]);
        expect((rolls[0] as any).rolls).toEqual([10, 8, 15]);
        expect((rolls[0] as any).skillPoints).toBe(7);
        done();
      });

      mockRealtime.emitRows('rolls', [{
        type: RollType.Skill,
        attributes: [14, 13, 12],
        rolls: [10, 8, 15],
        skill_points: 7,
        modifier: 0,
        name: 'Climbing',
        owner_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      }]);
    });

    it('should transform dice roll rows', (done) => {
      service.getRecentRolls().subscribe(rolls => {
        if (rolls.length === 0) return;
        expect(rolls[0].type).toBe(RollType.Dice);
        expect((rolls[0] as any).rolls).toEqual([4, 2, 6]);
        expect((rolls[0] as any).diceType).toBe(6);
        done();
      });

      mockRealtime.emitRows('rolls', [{
        type: RollType.Dice,
        dice_rolls: [4, 2, 6],
        dice_type: '6',
        owner_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      }]);
    });
  });
});
