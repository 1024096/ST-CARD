import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createScriptIdIframe, teleportStyle } from '@util/script';
import App from './App.vue';
import { maintainCurrentProfile, removeManagedEntries, restoreProfileForCurrentChat } from './services';
import { useManagerStore } from './store';
import type { ManagerRuntime } from './types';

$(() => {
  errorCatched(async () => {
    appendInexistentScriptButtons([{ name: '打开世界书角色平台', visible: true }]);
    const runtime: ManagerRuntime = { worldbookName: null, activeChatId: null };
    const pinia = createPinia();
    let app: ReturnType<typeof createApp> | null = null;
    let setMountedPanelOpen: ((open: boolean) => void) | null = null;
    let panelOpen = false;
    const positions: Record<'launcher' | 'panel', { left: number; top: number } | null> = {
      launcher: null,
      panel: null,
    };

    const $container = $('<div>')
      .css({
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        width: '58px',
        height: '58px',
        zIndex: 100000,
        background: 'transparent',
      })
      .appendTo('body');
    const $frame = createScriptIdIframe()
      .css({
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
      })
      .appendTo($container);
    const $dragHandle = $('<div>')
      .attr({ role: 'button', tabindex: '0', 'aria-label': '拖拽世界书角色平台悬浮球' })
      .css({
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        background: 'transparent',
      })
      .appendTo($container);

    const clampPosition = (left: number, top: number) => {
      const rect = $container[0].getBoundingClientRect();
      const margin = 8;
      return {
        left: _.clamp(left, margin, Math.max(margin, window.parent.innerWidth - rect.width - margin)),
        top: _.clamp(top, margin, Math.max(margin, window.parent.innerHeight - rect.height - margin)),
      };
    };

    const applyPosition = () => {
      const key = panelOpen ? 'panel' : 'launcher';
      const position = positions[key];
      if (!position) return;
      const clamped = clampPosition(position.left, position.top);
      positions[key] = clamped;
      $container.css({ left: `${clamped.left}px`, top: `${clamped.top}px`, right: 'auto', bottom: 'auto' });
    };

    const setPanelState = (open: boolean) => {
      panelOpen = open;
      const key = open ? 'panel' : 'launcher';
      const position = positions[key];
      $container.css({
        width: open ? 'min(440px, calc(100vw - 24px))' : '58px',
        height: open ? 'min(780px, calc(100vh - 24px))' : '58px',
        left: position ? `${position.left}px` : 'auto',
        top: position ? `${position.top}px` : 'auto',
        right: position ? 'auto' : open ? '12px' : '18px',
        bottom: position ? 'auto' : open ? '12px' : '18px',
      });
      $frame.css({ width: '100%', height: '100%' });
      $dragHandle
        .attr('aria-label', open ? '拖拽世界书角色平台面板' : '拖拽世界书角色平台悬浮球')
        .css(
          open
            ? { inset: '0 52px auto 0', width: 'auto', height: '76px', cursor: 'grab' }
            : { inset: 0, width: 'auto', height: 'auto', cursor: 'grab' },
        );
      applyPosition();
    };

    const openPanel = () => {
      if (setMountedPanelOpen) setMountedPanelOpen(true);
      else setPanelState(true);
    };

    let dragPointerId: number | null = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOriginLeft = 0;
    let dragOriginTop = 0;
    let dragMoved = false;
    const dragHandle = $dragHandle[0];
    const handleDragStart = (event: PointerEvent) => {
      if (event.button !== 0 || dragPointerId !== null) return;
      const rect = $container[0].getBoundingClientRect();
      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragOriginLeft = rect.left;
      dragOriginTop = rect.top;
      dragMoved = false;
      dragHandle.setPointerCapture(event.pointerId);
      $dragHandle.css('cursor', 'grabbing');
      event.preventDefault();
    };
    const handleDragMove = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) return;
      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (Math.abs(deltaX) + Math.abs(deltaY) > 4) dragMoved = true;
      const position = clampPosition(dragOriginLeft + deltaX, dragOriginTop + deltaY);
      positions[panelOpen ? 'panel' : 'launcher'] = position;
      $container.css({ left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' });
      event.preventDefault();
    };
    const handleDragEnd = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerId) return;
      if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event.pointerId);
      dragPointerId = null;
      $dragHandle.css('cursor', 'grab');
      if (!dragMoved && !panelOpen) openPanel();
    };
    const handleDragKey = (event: KeyboardEvent) => {
      if (!panelOpen && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openPanel();
      }
    };
    dragHandle.addEventListener('pointerdown', handleDragStart);
    dragHandle.addEventListener('pointermove', handleDragMove);
    dragHandle.addEventListener('pointerup', handleDragEnd);
    dragHandle.addEventListener('pointercancel', handleDragEnd);
    dragHandle.addEventListener('keydown', handleDragKey);

    $frame.on('load', () => {
      const frame = $frame[0];
      teleportStyle(frame.contentDocument!.head);
      app = createApp(App, {
        runtime,
        onPanelState: setPanelState,
      }).use(pinia);
      const appComponent = app.mount(frame.contentDocument!.body) as unknown as {
        setOpen: (open: boolean) => void;
      };
      setMountedPanelOpen = appComponent.setOpen;

      const store = useManagerStore(pinia);
      void restoreProfileForCurrentChat(store.settings.profiles[SillyTavern.getCurrentChatId()], runtime);
    });

    const offButton = eventOn(getButtonEvent('打开世界书角色平台'), () => {
      openPanel();
    });

    const handleResize = () => applyPosition();
    $(window.parent).on('resize', handleResize);

    const offChat = eventOn(tavern_events.CHAT_CHANGED, async () => {
      const store = useManagerStore(pinia);
      await removeManagedEntries(runtime.worldbookName);
      await restoreProfileForCurrentChat(store.settings.profiles[SillyTavern.getCurrentChatId()], runtime);
      await maintainCurrentProfile(store.settings, runtime, false);
    });

    const runMaintenance = (allowAutomaticUpdate: boolean) => {
      const store = useManagerStore(pinia);
      void maintainCurrentProfile(store.settings, runtime, allowAutomaticUpdate).catch(error => {
        console.error('[世界书角色平台] 自动维护失败:', error);
        toastr.error(error instanceof Error ? error.message : String(error));
      });
    };
    const offReceived = eventOn(tavern_events.MESSAGE_RECEIVED, () => runMaintenance(true));
    const offDeleted = eventOn(tavern_events.MESSAGE_DELETED, () => runMaintenance(false));
    const offSwiped = eventOn(tavern_events.MESSAGE_SWIPED, () => runMaintenance(false));
    const offUpdated = eventOn(tavern_events.MESSAGE_UPDATED, () => runMaintenance(false));

    $(window).on('pagehide', () => {
      offButton.stop();
      offChat.stop();
      offReceived.stop();
      offDeleted.stop();
      offSwiped.stop();
      offUpdated.stop();
      $(window.parent).off('resize', handleResize);
      dragHandle.removeEventListener('pointerdown', handleDragStart);
      dragHandle.removeEventListener('pointermove', handleDragMove);
      dragHandle.removeEventListener('pointerup', handleDragEnd);
      dragHandle.removeEventListener('pointercancel', handleDragEnd);
      dragHandle.removeEventListener('keydown', handleDragKey);
      void removeManagedEntries(runtime.worldbookName);
      setMountedPanelOpen = null;
      app?.unmount();
      $container.remove();
    });

    console.info('[世界书角色平台] 已加载');
  })();
});
