import {Button, ButtonIcon} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Bookmark_Stroke2_Corner0_Rounded as BookmarkIcon} from '#/components/icons/Bookmark'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {SaveToCollectionDialog} from '#/components/SaveToCollectionDialog'
import {CIVIC_TREE_LABELS} from '#/features/civicTree/labels'
import {ContributeToCommunityTreeDialog} from '#/features/communityCivicTree/components/ContributeToCommunityTreeDialog'

/** Saves a policy or debate to a personal collection, or offers it to a community tree. */
export function SaveButton({
  policyUri,
  policyTitle,
  policyCategory,
  policyColor,
}: {
  policyUri: string
  policyTitle?: string
  policyCategory?: string
  policyColor?: string
}) {
  const control = Dialog.useDialogControl()
  const contributeControl = Dialog.useDialogControl()
  if (!policyUri) return null
  const title = policyTitle || policyUri
  return (
    <>
      <Button
        label={CIVIC_TREE_LABELS.savePersonal}
        size="small"
        variant="ghost"
        color="secondary"
        shape="round"
        onPress={control.open}>
        <ButtonIcon icon={BookmarkIcon} size="lg" />
      </Button>
      <SaveToCollectionDialog
        control={control}
        policyUri={policyUri}
        policyTitle={policyTitle}
        policyCategory={policyCategory}
        policyColor={policyColor}
      />
      <Button
        label={CIVIC_TREE_LABELS.contributeCommunity}
        size="small"
        variant="ghost"
        color="secondary"
        shape="round"
        onPress={contributeControl.open}>
        <ButtonIcon icon={TreeIcon} size="lg" />
      </Button>
      <ContributeToCommunityTreeDialog
        control={contributeControl}
        sourceUri={policyUri}
        title={title}
        category={policyCategory}
      />
    </>
  )
}
