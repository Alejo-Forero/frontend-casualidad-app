import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutComponent } from './layout';
import { ActivatedRoute } from '@angular/router';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {}
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle profile dropdown on button click', () => {
    const mockEvent = { stopPropagation: () => { } } as unknown as Event;

    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(true);

    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should close profile dropdown only when open', () => {
    component.showProfileDropdown = false;
    component.closeProfileDropdown(); // should not throw, no-op
    expect(component.showProfileDropdown).toBe(false);

    component.showProfileDropdown = true;
    component.closeProfileDropdown();
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should open and close config modal', () => {
    const mockEvent = { stopPropagation: () => { } } as unknown as Event;

    component.openConfigModal(mockEvent);
    expect(component.showConfigModal).toBe(true);
    expect(component.showProfileDropdown).toBe(false);

    component.closeConfigModal();
    expect(component.showConfigModal).toBe(false);

    // Without event
    component.openConfigModal();
    expect(component.showConfigModal).toBe(true);
  });

  it('should open and close delete modal', () => {
    const mockEvent = { stopPropagation: () => { }, preventDefault: () => { } } as unknown as Event;

    component.openDeleteModal(mockEvent);
    expect(component.showDeleteModal).toBe(true);
    expect(component.showConfigModal).toBe(false);

    component.closeDeleteModal();
    expect(component.showDeleteModal).toBe(false);

    // Without event
    component.openDeleteModal();
    expect(component.showDeleteModal).toBe(true);
  });

  it('should confirm delete and close modal', () => {
    component.showDeleteModal = true;
    component.confirmDelete();
    expect(component.showDeleteModal).toBe(false);
  });

  it('should close profile dropdown on document click', () => {
    component.showProfileDropdown = true;
    component.onDocumentClick();
    expect(component.showProfileDropdown).toBe(false);
  });
});

