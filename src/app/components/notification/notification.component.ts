import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { LucideAngularModule, Check, X, AlertTriangle, Info } from 'lucide-angular';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
      <div *ngFor="let toast of toasts" 
           class="pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-350 transform translate-x-0 animate-in slide-in-from-right-8 fade-in-50"
           [ngClass]="{
             'border-l-4 border-l-emerald-500': toast.type === 'success',
             'border-l-4 border-l-rose-500': toast.type === 'error',
             'border-l-4 border-l-amber-500': toast.type === 'warning',
             'border-l-4 border-l-blue-500': toast.type === 'info'
           }">
        <div class="flex items-center gap-3">
          <!-- Icon indicator -->
          <div class="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm"
               [ngClass]="{
                 'bg-emerald-500 shadow-emerald-500/20': toast.type === 'success',
                 'bg-rose-500 shadow-rose-500/20': toast.type === 'error',
                 'bg-amber-500 shadow-amber-500/20': toast.type === 'warning',
                 'bg-blue-500 shadow-blue-500/20': toast.type === 'info'
               }">
            <lucide-icon [name]="toast.type === 'success' ? Check : (toast.type === 'error' ? X : (toast.type === 'warning' ? AlertTriangle : Info))" size="14"></lucide-icon>
          </div>
          
          <div class="flex flex-col pr-2">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100">
              {{ toast.type === 'success' ? 'Éxito' : (toast.type === 'error' ? 'Error' : (toast.type === 'warning' ? 'Advertencia' : 'Información')) }}
            </span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">{{ toast.message }}</span>
          </div>
        </div>

        <button (click)="remove(toast.id)" class="text-slate-350 hover:text-slate-500 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0">
          <lucide-icon [name]="X" size="12"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class NotificationComponent implements OnInit, OnDestroy {
  readonly Check = Check;
  readonly X = X;
  readonly AlertTriangle = AlertTriangle;
  readonly Info = Info;

  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private notifService: NotificationService) {}

  ngOnInit() {
    this.sub = this.notifService.toasts$.subscribe(toast => {
      this.toasts.push(toast);
      // Auto-remove after 4 seconds
      setTimeout(() => {
        this.remove(toast.id);
      }, 4000);
    });
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
