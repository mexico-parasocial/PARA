import {Button, ButtonText} from '#/components/Button'
import * as Menu from '#/components/Menu'

export function MenuSelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string
  options: {value: string; label: string}[]
  onChange: (value: string) => void
  label: string
}) {
  const currentLabel =
    options.find(o => o.value === value)?.label ?? options[0]?.label ?? label

  return (
    <Menu.Root>
      <Menu.Trigger label={label}>
        {({props}) => (
          <Button
            {...props}
            label={props.accessibilityLabel}
            size="small"
            color="secondary"
            variant="solid">
            <ButtonText>{currentLabel}</ButtonText>
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Outer>
        <Menu.LabelText>{label}</Menu.LabelText>
        <Menu.Group>
          {options.map(option => (
            <Menu.Item
              key={option.value}
              label={option.label}
              onPress={() => onChange(option.value)}>
              <Menu.ItemText>{option.label}</Menu.ItemText>
              <Menu.ItemRadio selected={value === option.value} />
            </Menu.Item>
          ))}
        </Menu.Group>
      </Menu.Outer>
    </Menu.Root>
  )
}
