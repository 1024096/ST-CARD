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

    const $frame = createScriptIdIframe()
      .css({
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        width: '58px',
        height: '58px',
        zIndex: 100000,
        background: 'transparent',
      })
      .appendTo('body')
      .on('load', () => {
        const frame = $frame[0];
        teleportStyle(frame.contentDocument!.head);
        app = createApp(App, {
          runtime,
          onPanelState(open: boolean) {
            $frame.css(
              open
                ? {
                    width: 'min(440px, calc(100vw - 24px))',
                    height: 'min(780px, calc(100vh - 24px))',
                    right: '12px',
                    bottom: '12px',
                  }
                : { width: '58px', height: '58px', right: '18px', bottom: '18px' },
            );
          },
        }).use(pinia);
        app.mount(frame.contentDocument!.body);

        const store = useManagerStore(pinia);
        void restoreProfileForCurrentChat(store.settings.profiles[SillyTavern.getCurrentChatId()], runtime);
      });

    const offButton = eventOn(getButtonEvent('打开世界书角色平台'), () => {
      $frame.css({
        width: 'min(440px, calc(100vw - 24px))',
        height: 'min(780px, calc(100vh - 24px))',
        right: '12px',
        bottom: '12px',
      });
      $frame[0].contentWindow?.dispatchEvent(new CustomEvent('lcm-open'));
    });

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
      void removeManagedEntries(runtime.worldbookName);
      app?.unmount();
      $frame.remove();
    });

    console.info('[世界书角色平台] 已加载');
  })();
});
