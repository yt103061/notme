import { useEffect, useState } from "react";
import { getSettings, updateSettings, subscribeSettings, type Settings } from "../../core/settings";
import "./SettingsPanel.css";

export interface SettingsPanelProps {
  onClose: () => void;
}

/** Phase6: reduced-motion・音・触覚・そっと促す演出のオン/オフをユーザーに委ねる。 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>(getSettings());

  useEffect(() => subscribeSettings(setSettings), []);

  return (
    <div className="settings-panel" onClick={onClose}>
      <div className="settings-panel__sheet" onClick={(e) => e.stopPropagation()}>
        <h2>設定</h2>

        <label className="settings-panel__row">
          <span>アニメーションを控えめにする</span>
          <input
            type="checkbox"
            checked={settings.motion === "reduced"}
            onChange={(e) => updateSettings({ motion: e.target.checked ? "reduced" : "full" })}
          />
        </label>

        <label className="settings-panel__row">
          <span>音(紙の接触音)</span>
          <input
            type="checkbox"
            checked={settings.soundOn}
            onChange={(e) => updateSettings({ soundOn: e.target.checked })}
          />
        </label>

        <label className="settings-panel__row">
          <span>触覚(対応端末のみ)</span>
          <input
            type="checkbox"
            checked={settings.hapticsOn}
            onChange={(e) => updateSettings({ hapticsOn: e.target.checked })}
          />
        </label>

        <label className="settings-panel__row">
          <span>次の一手をそっと促す</span>
          <input
            type="checkbox"
            checked={settings.nudgesOn}
            onChange={(e) => updateSettings({ nudgesOn: e.target.checked })}
          />
        </label>

        <button className="settings-panel__close" onClick={onClose}>閉じる</button>
      </div>
    </div>
  );
}
