import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PageNotFoundComponent } from './core/components/page-not-found/page-not-found.component';
import { AuthGuardService } from './core/services/auth-guard.service';


const routes: Routes = [
  {
    path: 'achievements',
    loadChildren: () => import('./achievements/achievements.module').then(m => m.AchievementsModule),
    canLoad: [AuthGuardService],
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'combat',
    loadChildren: () => import('./combat/combat.module').then(m => m.CombatModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'inventory',
    loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.module').then(m => m.NotesModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'overview',
    loadChildren: () => import('./overview/overview.module').then(m => m.OverviewModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'people',
    loadChildren: () => import('./people/people.module').then(m => m.PeopleModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'places',
    loadChildren: () => import('./places/places.module').then(m => m.PlacesModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'projects',
    loadChildren: () => import('./projects/projects.module').then(m => m.ProjectsModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'quests',
    loadChildren: () => import('./quests/quests.module').then(m => m.QuestsModule),
    canLoad: [AuthGuardService]
  },
  {
    path: 'rules',
    loadChildren: () => import('./rules/rules.module').then(m => m.RulesModule),
    canLoad: [AuthGuardService]
  },
  {
    path: '',
    redirectTo: '/overview',
    pathMatch: 'full'
  },
  {
    path: '**',
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
