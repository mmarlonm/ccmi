import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    /* ── Container ───────────────────────────────────────── */
    .toast-stack {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 340px;
      pointer-events: none;
    }

    /* ── Card ─────────────────────────────────────────────── */
    .toast-card {
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      overflow: hidden;
      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.10),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 1px 0 rgba(255,255,255,0.7);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(20px) saturate(1.8);
      -webkit-backdrop-filter: blur(20px) saturate(1.8);
      border: 1px solid rgba(255, 255, 255, 0.5);
      animation: toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    /* Dark mode */
    :host-context(html.dark) .toast-card {
      background: rgba(15, 23, 42, 0.82);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow:
        0 4px 32px rgba(0, 0, 0, 0.40),
        0 1px 4px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255,255,255,0.05);
    }

    /* ── Top accent bar ───────────────────────────────────── */
    .toast-accent {
      height: 3px;
      width: 100%;
      flex-shrink: 0;
    }
    .toast-accent.success { background: linear-gradient(90deg, #10b981, #34d399); }
    .toast-accent.error   { background: linear-gradient(90deg, #f43f5e, #fb7185); }
    .toast-accent.warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .toast-accent.info    { background: linear-gradient(90deg, #6366f1, #818cf8); }

    /* ── Body ─────────────────────────────────────────────── */
    .toast-body {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px 12px;
    }

    /* ── Icon dot ─────────────────────────────────────────── */
    .toast-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toast-icon.success { background: rgba(16, 185, 129, 0.12); }
    .toast-icon.error   { background: rgba(244, 63,  94,  0.12); }
    .toast-icon.warning { background: rgba(245, 158, 11,  0.12); }
    .toast-icon.info    { background: rgba(99,  102, 241, 0.12); }

    .toast-icon svg {
      width: 16px;
      height: 16px;
    }
    .toast-icon.success svg { stroke: #10b981; }
    .toast-icon.error   svg { stroke: #f43f5e; }
    .toast-icon.warning svg { stroke: #f59e0b; }
    .toast-icon.info    svg { stroke: #6366f1; }

    /* ── Text ─────────────────────────────────────────────── */
    .toast-content { flex: 1; min-width: 0; }

    .toast-title {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
      color: #0f172a;
      margin: 0 0 3px;
      letter-spacing: -0.01em;
    }
    :host-context(html.dark) .toast-title { color: #f1f5f9; }

    .toast-title.success { color: #065f46; }
    .toast-title.error   { color: #9f1239; }
    .toast-title.warning { color: #78350f; }
    .toast-title.info    { color: #312e81; }

    :host-context(html.dark) .toast-title.success { color: #6ee7b7; }
    :host-context(html.dark) .toast-title.error   { color: #fda4af; }
    :host-context(html.dark) .toast-title.warning { color: #fde68a; }
    :host-context(html.dark) .toast-title.info    { color: #a5b4fc; }

    .toast-msg {
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.5;
      color: #475569;
      margin: 0;
    }
    :host-context(html.dark) .toast-msg { color: #94a3b8; }

    /* ── Close button ─────────────────────────────────────── */
    .toast-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      color: #94a3b8;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -2px;
    }
    .toast-close:hover {
      background: rgba(0,0,0,0.06);
      color: #475569;
    }
    :host-context(html.dark) .toast-close:hover {
      background: rgba(255,255,255,0.08);
      color: #e2e8f0;
    }
    .toast-close svg { width: 13px; height: 13px; }

    /* ── Progress bar ─────────────────────────────────────── */
    .toast-progress-track {
      height: 2px;
      background: rgba(0,0,0,0.06);
      margin: 0 16px 10px;
      border-radius: 99px;
      overflow: hidden;
    }
    :host-context(html.dark) .toast-progress-track {
      background: rgba(255,255,255,0.06);
    }
    .toast-progress-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.03s linear;
    }
    .toast-progress-fill.success { background: #10b981; }
    .toast-progress-fill.error   { background: #f43f5e; }
    .toast-progress-fill.warning { background: #f59e0b; }
    .toast-progress-fill.info    { background: #6366f1; }

    /* ── Animation ────────────────────────────────────────── */
    @keyframes toast-in {
      from { opacity: 0; transform: translateX(48px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0)    scale(1);    }
    }
  `],
  template: `
    <div class="toast-stack">
      <div *ngFor="let toast of toasts; trackBy: trackById" class="toast-card">

        <!-- Top accent line -->
        <div class="toast-accent" [class]="toast.type"></div>

        <!-- Body row -->
        <div class="toast-body">

          <!-- Icon -->
          <div class="toast-icon" [class]="toast.type">
            <!-- Success -->
            <svg *ngIf="toast.type === 'success'" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <!-- Error -->
            <svg *ngIf="toast.type === 'error'" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <!-- Warning -->
            <svg *ngIf="toast.type === 'warning'" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <!-- Info -->
            <svg *ngIf="toast.type === 'info'" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>

          <!-- Text -->
          <div class="toast-content">
            <p class="toast-title" [class]="toast.type">{{ toast.title }}</p>
            <p class="toast-msg">{{ toast.message }}</p>
          </div>

          <!-- Close -->
          <button class="toast-close" (click)="dismiss(toast.id)" title="Cerrar">
            <svg fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Progress bar -->
        <div class="toast-progress-track">
          <div class="toast-progress-fill" [class]="toast.type" [style.width.%]="toast.progress"></div>
        </div>

      </div>
    </div>
  `
})
export class NotificationComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private notifService: NotificationService) {}

  ngOnInit() {
    this.sub = this.notifService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  dismiss(id: string) {
    this.notifService.dismiss(id);
  }

  trackById(_: number, toast: Toast) {
    return toast.id;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
