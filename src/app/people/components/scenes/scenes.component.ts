import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { faPen, faTrash, faUserLock } from '@fortawesome/free-solid-svg-icons';

import type { EditSceneProps, Scene } from '../../models';
import type { EditAccessProps } from '../../../shared';
import { AuthService } from '../../../core/services/auth.service';
import { PopoverService } from '../../../core/services/popover.service';
import { SceneService } from '../../services/scene.service';
import { EditSceneComponent } from '../edit-scene/edit-scene.component';
import { EditAccessComponent } from '../../../shared/components/edit-access/edit-access.component';



@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.component.html',
  styleUrls: ['./scenes.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ScenesComponent {
  private auth = inject(AuthService);
  private popover = inject(PopoverService);
  private sceneService = inject(SceneService);

  @Input() scenes: Scene[] = [];
  faPen = faPen;
  faTrash = faTrash;
  faUserLock = faUserLock;



  canManage(scene: Scene): boolean {
    const user = this.auth.user;
    return !!user && (user.isGM || user.id === scene.owner);
  }


  edit(scene: Scene) {
    this.popover.showPopover<EditSceneProps>('Szene bearbeiten', EditSceneComponent, { scene });
  }


  editAccess(scene: Scene) {
    this.popover.showPopover<EditAccessProps>('Zugriff regeln', EditAccessComponent, {
      collection: SceneService.collection,
      documentId: scene.id,
      ownerId: scene.owner,
    });
  }


  async remove(scene: Scene) {
    if (!confirm('Diese Szene löschen?')) {
      return;
    }
    try {
      await this.sceneService.delete(scene);
    } catch (error) {
      console.error('Deleting scene failed', error);
    }
  }
}
