import { useState } from 'react';
import { TEST_IDS } from '../../shared/constants/testIds.constants';

interface InviteLinkProps {
  link: string;
  joinCode: string;
}

/**
 * The link to send someone, and the code to read out.
 *
 * Both, because they are used in different rooms: a link works in a chat app,
 * and the code works when the person is standing next to you with their phone.
 * The code is rendered in the mono face at size, since it is going to be read
 * aloud - and it never contains O, 0, I or 1 for the same reason.
 */
export function InviteLink({ link, joinCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied in plenty of contexts. The link is on screen
      // and selectable, so this is a convenience failing, not the feature.
      setCopied(false);
    }
  };

  return (
    <div className="invite-link">
      <p className="eyebrow">Invite</p>
      <p className="invite-code" data-testid={TEST_IDS.lobbyJoinCode}>
        {joinCode}
      </p>
      <div className="invite-link-row">
        <input
          className="text-input"
          data-testid={TEST_IDS.lobbyInviteLink}
          onFocus={(event) => event.target.select()}
          readOnly
          value={link}
        />
        <button className="secondary-button" onClick={copy} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="helper-text">
        Anyone with this link can join and play. Only share it with people you want at the
        table.
      </p>
    </div>
  );
}
