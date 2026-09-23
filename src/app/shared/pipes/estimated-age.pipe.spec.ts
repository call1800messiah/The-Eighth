import { of } from 'rxjs';
import { EstimatedAgePipe } from './estimated-age.pipe';
import { CampaignService } from '../../overview/services/campaign.service';

describe('EstimatedAgePipe', () => {
  let pipe: EstimatedAgePipe;
  let mockCampaignService: any;

  beforeEach(() => {
    mockCampaignService = {
      getCampaignInfo: jasmine.createSpy('getCampaignInfo').and.returnValue(
        of({ date: '1 Praios 1040' })
      ),
    };
    pipe = new EstimatedAgePipe(mockCampaignService as CampaignService);
  });

  afterEach(() => {
    pipe.ngOnDestroy();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return approximate age when campaign date is set', () => {
    // Campaign year is 1040, birth year 1010 => age 30
    const result = pipe.transform(1010);
    expect(result).toBe('ca. 30 Jahre');
  });

  it('should return birth year with BF when no campaign date', () => {
    const noCampaign = {
      getCampaignInfo: jasmine.createSpy().and.returnValue(of(null)),
    };
    const p = new EstimatedAgePipe(noCampaign as any);
    expect(p.transform(1010)).toBe('1010 BF');
    p.ngOnDestroy();
  });

  it('should return "unermeßlich alt" for ages over 10000', () => {
    // Campaign 1040, birth year -10000 => age 11040
    expect(pipe.transform(-10000)).toBe('unermeßlich alt');
  });

  it('should return "mehrere tausend Jahre" for ages 2001-10000', () => {
    // 1040 - (-2000) = 3040
    expect(pipe.transform(-2000)).toBe('mehrere tausend Jahre');
  });

  it('should return "über tausend Jahre" for ages 1001-2000', () => {
    // 1040 - (-500) = 1540
    expect(pipe.transform(-500)).toBe('über tausend Jahre');
  });

  it('should return "mehrere hundert Jahre" for ages 301-1000', () => {
    // 1040 - 640 = 400
    expect(pipe.transform(640)).toBe('mehrere hundert Jahre');
  });

  it('should round to nearest 10 for ages 61-300', () => {
    // 1040 - 960 = 80 => ca. 80 Jahre
    expect(pipe.transform(960)).toBe('ca. 80 Jahre');
  });

  it('should round to nearest 5 for ages 21-60', () => {
    // 1040 - 1005 = 35 => ca. 35 Jahre
    expect(pipe.transform(1005)).toBe('ca. 35 Jahre');
  });

  it('should show exact age for ages 20 and under', () => {
    // 1040 - 1025 = 15 => ca. 15 Jahre
    expect(pipe.transform(1025)).toBe('ca. 15 Jahre');
  });
});
