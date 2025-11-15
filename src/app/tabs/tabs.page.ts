import { Component, EnvironmentInjector, inject, OnInit } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, clipboardOutline, cameraOutline, documentTextOutline, homeOutline } from 'ionicons/icons';
import { SupabaseService } from '../core/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage implements OnInit {
  public environmentInjector = inject(EnvironmentInjector);
  userRole: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({ 
      peopleOutline, 
      clipboardOutline, 
      cameraOutline, 
      documentTextOutline,
      homeOutline
    });
  }

  async ngOnInit() {
    await this.verificarRol();
  }

  async verificarRol() {
    try {
      const userData = await this.supabaseService.getUserRole();
      this.userRole = userData?.role || null;
      console.log('Rol del usuario en tabs:', this.userRole);
    } catch (error) {
      console.error('Error al obtener el rol:', error);
    }
  }

  async onTabChange(event: any) {
    const selectedTab = event.tab;
    
    if (this.userRole === 'administrador' && (selectedTab === 'tab2' || selectedTab === 'tab3')) {
      event.preventDefault();
      
      await this.mostrarAlertaAccesoRestringido();
      
      setTimeout(() => {
        this.router.navigate(['/tabs/tab1']);
      }, 100);
    }
  }

  async mostrarAlertaAccesoRestringido() {
    const alert = await this.alertController.create({
      header: '⚠️ Acceso Restringido',
      message: 'Esta sección es solo para usuarios con rol de <strong>Medidor</strong>. Como <strong>Administrador</strong>, solo puedes ver los registros en el Panel de Administrador.',
      buttons: ['Entendido']
    });

    await alert.present();
  }
}
