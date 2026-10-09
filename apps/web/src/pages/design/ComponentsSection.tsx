import { useState } from 'react';
import { MemoryRouter } from 'react-router';

import BackLink from '../../components/ui/BackLink';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Switch from '../../components/ui/Switch';
import TextField from '../../components/ui/TextField';

import pageStyles from './DesignPage.module.css';
import styles from './ComponentsSection.module.css';

const buttonVariants = ['primary', 'secondary', 'outline'] as const;
const buttonSizes = ['md', 'lg'] as const;
const modes = ['Solo', 'Couple', 'Squad'] as const;

export default function ComponentsSection() {
  const [selectedMode, setSelectedMode] = useState<(typeof modes)[number]>('Solo');
  const [standaloneSelected, setStandaloneSelected] = useState(false);
  const [switchOff, setSwitchOff] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [switchHidden, setSwitchHidden] = useState(false);

  return (
    <section className={pageStyles.section} id="components">
      <div className={pageStyles.sectionHeading}>
        <p className={pageStyles.sectionIndex}>06</p>
        <div>
          <h2>Components</h2>
          <p>Every primitive variant and state, ready for feature screens.</p>
        </div>
      </div>

      <div className={styles.group}>
        <h3>Button</h3>
        <div className={styles.buttonGrid}>
          {buttonVariants.map((variant) =>
            buttonSizes.map((size) => (
              <div className={styles.demoCell} key={`${variant}-${size}`}>
                <span className={styles.demoLabel}>
                  {variant} · {size}
                </span>
                <Button size={size} variant={variant}>
                  {variant === 'primary' && size === 'lg'
                    ? 'Xoay kèo ngay'
                    : variant === 'primary'
                      ? 'Thêm lựa chọn'
                      : 'Quay lại'}
                </Button>
              </div>
            )),
          )}
          <div className={styles.demoCell}>
            <span className={styles.demoLabel}>disabled</span>
            <Button disabled>Thêm lựa chọn</Button>
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3>BackLink</h3>
        <div className={styles.demoCell}>
          <span className={styles.demoLabel}>router link</span>
          <MemoryRouter>
            <BackLink to="/">Trở về</BackLink>
          </MemoryRouter>
        </div>
      </div>

      <div className={styles.group}>
        <h3>Card</h3>
        <div className={styles.cardGrid}>
          {(['surface', 'primary', 'secondary', 'accent'] as const).map((tone) => (
            <Card key={tone} tone={tone}>
              <h4 className={styles.cardTitle}>Ăn gì tối nay?</h4>
              <p>Phở, bún chả hay cơm tấm?</p>
              <span className={styles.demoLabel}>{tone}</span>
            </Card>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h3>Chip</h3>
        <div className={styles.chipExamples}>
          <div className={styles.chipGroup} role="group" aria-label="Modes">
            <span className={styles.demoLabel}>Exactly one selected</span>
            <div className={styles.inlineItems}>
              {modes.map((mode) => (
                <Chip
                  key={mode}
                  selected={selectedMode === mode}
                  onSelectedChange={() => setSelectedMode(mode)}
                >
                  {mode}
                </Chip>
              ))}
            </div>
          </div>
          <div className={styles.chipGroup}>
            <span className={styles.demoLabel}>Standalone toggle</span>
            <Chip selected={standaloneSelected} onSelectedChange={setStandaloneSelected}>
              Đề xuất hôm nay
            </Chip>
          </div>
          <div className={styles.chipGroup}>
            <span className={styles.demoLabel}>Locked modes</span>
            <div className={styles.inlineItems}>
              <Chip disabled selected={false}>
                Couple <Badge>Sắp có</Badge>
              </Chip>
              <Chip disabled selected={false}>
                Squad <Badge>Sắp có</Badge>
              </Chip>
              <Chip disabled selected>
                Đã chọn
              </Chip>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <h3>Badge</h3>
        <div className={styles.inlineItems}>
          <Badge>Sắp có</Badge>
          <Badge tone="neutral">Neutral</Badge>
        </div>
      </div>

      <div className={styles.group}>
        <h3>TextField</h3>
        <div className={styles.fieldGrid}>
          <TextField label="Lựa chọn" placeholder="Thêm một lựa chọn…" />
          <TextField
            hint="Bạn có thể thêm nhiều lựa chọn hơn."
            label="Lựa chọn có gợi ý"
            placeholder="Ví dụ: bánh mì"
          />
          <TextField error="Không được để trống" label="Lựa chọn có lỗi" />
          <TextField defaultValue="Không thể chỉnh sửa" disabled label="Lựa chọn bị khóa" />
          <TextField hideLabel label="Nhãn ẩn" placeholder="Nhãn vẫn được đọc bởi screen reader" />
        </div>
      </div>

      <div className={styles.group}>
        <h3>Switch</h3>
        <div className={styles.switchGrid}>
          <Switch checked={switchOff} label="Tắt thông báo" onCheckedChange={setSwitchOff} />
          <Switch checked={switchOn} label="Bật thông báo" onCheckedChange={setSwitchOn} />
          <Switch checked label="Không khả dụng" onCheckedChange={() => undefined} disabled />
          <Switch
            checked={switchHidden}
            hideLabel
            label="Nhãn ẩn của switch"
            onCheckedChange={setSwitchHidden}
          />
        </div>
      </div>
    </section>
  );
}
