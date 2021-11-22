import styles from './Channel.module.scss';
import { ChannelCard } from '@/components/Card';

export const Channel = ({ channels }) => {
  return (
    <main className={styles['main']}>
      <div className={styles['container']}>
        {channels.map(({ logo, name, originalName, tvgId }) => (
          <div className={styles['container-item']}>
            <ChannelCard
              logo={logo}
              name={name}
              originalName={originalName}
              tvgId={tvgId}
            />
          </div>
        ))}
      </div>
    </main>
  );
};
