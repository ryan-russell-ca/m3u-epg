import clsx from 'clsx';
import { ChannelInfoModel } from '@/types/m3u';
import { ChannelCard } from '@/components/Card';
import styles from './ClickableChannels.module.scss';

const ClickableChannels = ({
  channels,
  selectedUrls,
  onClick,
}: {
  channels: ChannelInfoModel[];
  selectedUrls: string[];
  onClick: (channel: ChannelInfoModel) => void;
}) => (
  <div className={styles['clickable-channels-container']}>
    {channels.map((channel, i) => (
      <div
        onClick={() => onClick(channel)}
        key={`tvgId-${i}`}
        className={clsx(styles['clickable-channels-item'], {
          [styles['container-item-selected']]: selectedUrls.includes(
            channel.url
          ),
        })}
      >
        <ChannelCard channel={channel} />
      </div>
    ))}
  </div>
);

export default ClickableChannels;
