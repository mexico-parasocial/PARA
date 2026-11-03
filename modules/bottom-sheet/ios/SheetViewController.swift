//
//  SheetViewController.swift
//  Pods
//
//  Created by Hailey on 9/30/24.
//

import Foundation
import UIKit

class SheetViewController: UIViewController,
  UISheetPresentationControllerDelegate,
  UIPopoverPresentationControllerDelegate {
  // Callbacks wired up by SheetView
  var onPresentedBoundsChange: ((CGSize, UIEdgeInsets, CGFloat, Bool) -> Void)?
  var onAttemptDismiss: (() -> Void)?
  var onDetentChange: ((UISheetPresentationController.Detent.Identifier?) -> Void)?
  var onShouldDismiss: (() -> Bool)?
  var onWillDismiss: (() -> Void)?
  var onDidDismiss: (() -> Void)?

  private let popoverMode: BottomSheetPopoverMode
  private let popoverWidth: CGFloat
  private let preferredCornerRadius: CGFloat?
  private var containerBackgroundColor: UIColor?
  private var userInterfaceStyle: UIUserInterfaceStyle

  // The last detent request, replayed onto a sheet UIKit creates later (a popover
  // adapting to compact width hands us its sheet only when it adapts).
  private var contentHeight: CGFloat = 0
  private var preventExpansion = false
  private var fullHeight = false

  // Clips React's content canvas to the usable presentation frame. A popover
  // insets it from the arrow, and the canvas itself stays taller than that.
  private let contentContainer = UIView()
  private var lastReportedBounds: (CGSize, UIEdgeInsets, CGFloat, Bool)?

  private static let contentDetentIdentifier = UISheetPresentationController.Detent.Identifier(
    "content"
  )

  init(
    popoverMode: BottomSheetPopoverMode = .never,
    popoverWidth: CGFloat = 320,
    preferredCornerRadius: CGFloat? = nil,
    containerBackgroundColor: UIColor? = nil,
    userInterfaceStyle: UIUserInterfaceStyle = .unspecified
  ) {
    self.popoverMode = popoverMode
    self.popoverWidth = popoverWidth
    self.preferredCornerRadius = preferredCornerRadius
    self.containerBackgroundColor = containerBackgroundColor
    self.userInterfaceStyle = userInterfaceStyle
    super.init(nibName: nil, bundle: nil)

    self.overrideUserInterfaceStyle = userInterfaceStyle
    self.isModalInPresentation = false

    if popoverMode == .never {
      self.modalPresentationStyle = .formSheet
      if let sheet = self.sheetPresentationController {
        self.configure(sheet)
      }
    } else {
      self.modalPresentationStyle = .popover
      self.popoverPresentationController?.delegate = self
    }
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  // MARK: - View lifecycle

  override func viewDidLoad() {
    super.viewDidLoad()
    self.contentContainer.clipsToBounds = true
    self.view.addSubview(self.contentContainer)
    self.applyContainerBackground()
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    self.applyUserInterfaceStyleToContainer()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()

    let isPopover = self.presentationController is UIPopoverPresentationController
    let frame: CGRect
    let insets: UIEdgeInsets
    if isPopover {
      frame = self.view.safeAreaLayoutGuide.layoutFrame
      insets = .zero
    } else {
      frame = self.view.bounds
      insets = self.view.safeAreaInsets
    }
    self.contentContainer.frame = frame

    var bottomOffset: CGFloat = 0
    if let window = self.view.window {
      let frameInWindow = self.view.convert(frame, to: window)
      bottomOffset = max(0, window.bounds.height - frameInWindow.maxY)
    }

    if let last = self.lastReportedBounds,
       last.0 == frame.size, last.1 == insets, last.2 == bottomOffset, last.3 == isPopover {
      return
    }
    self.lastReportedBounds = (frame.size, insets, bottomOffset, isPopover)
    self.onPresentedBoundsChange?(frame.size, insets, bottomOffset, isPopover)
  }

  // MARK: - Content and appearance

  func setContentView(_ contentView: UIView) {
    self.loadViewIfNeeded()
    contentView.frame.origin = .zero
    self.contentContainer.addSubview(contentView)
  }

  func setContainerBackgroundColor(_ color: UIColor?) {
    self.containerBackgroundColor = color
    self.applyContainerBackground()
  }

  func setUserInterfaceStyle(_ style: UIUserInterfaceStyle) {
    self.userInterfaceStyle = style
    self.overrideUserInterfaceStyle = style
    self.applyUserInterfaceStyleToContainer()
  }

  func setPopoverSource(sourceView: UIView, sourceRect: CGRect) {
    guard let popover = self.popoverPresentationController else { return }
    popover.sourceView = sourceView
    popover.sourceRect = sourceRect
  }

  // Transparent surfaces stay clear so UIKit's presentation material shows through.
  private func applyContainerBackground() {
    guard self.isViewLoaded else { return }
    if let color = self.containerBackgroundColor, color.cgColor.alpha > 0 {
      self.view.backgroundColor = color
    } else {
      self.view.backgroundColor = .clear
    }
  }

  private func applyUserInterfaceStyleToContainer() {
    self.presentationController?.containerView?.overrideUserInterfaceStyle = self.userInterfaceStyle
  }

  // MARK: - Detents

  /// The sheet currently presenting this controller, including the one a popover
  /// adapts into on compact widths.
  private var currentSheet: UISheetPresentationController? {
    if let sheet = self.sheetPresentationController {
      return sheet
    }
    if #available(iOS 16.0, *) {
      return self.popoverPresentationController?.adaptiveSheetPresentationController
    }
    return nil
  }

  /// Height available to the sheet in its window, or nil before it is in one.
  var availablePresentationHeight: CGFloat? {
    guard let window = self.view.window ?? self.presentingViewController?.view.window else {
      return nil
    }
    return max(1, window.bounds.height - window.safeAreaInsets.top - window.safeAreaInsets.bottom)
  }

  func setDetents(contentHeight: CGFloat, preventExpansion: Bool, fullHeight: Bool = false) {
    self.contentHeight = contentHeight
    self.preventExpansion = preventExpansion
    self.fullHeight = fullHeight

    if self.popoverMode != .never, contentHeight > 0 {
      self.preferredContentSize = CGSize(width: self.popoverWidth, height: contentHeight)
    }
    if let sheet = self.currentSheet {
      self.applyDetents(to: sheet, keepingExpansion: false)
    }
  }

  /// Resizes the sheet to follow its content, animated.
  func updateContentSize(contentHeight: CGFloat, preventExpansion: Bool) {
    self.contentHeight = contentHeight
    self.preventExpansion = preventExpansion

    if self.popoverMode != .never, contentHeight > 0 {
      self.preferredContentSize = CGSize(width: self.popoverWidth, height: contentHeight)
    }
    guard let sheet = self.currentSheet else { return }

    // Capture `self` and `sheet` weakly so animateChanges holds no strong references.
    sheet.animateChanges { [weak self, weak sheet] in
      guard let self = self, let sheet = sheet else { return }
      self.applyDetents(to: sheet, keepingExpansion: true)
      if #available(iOS 16.0, *) {
        sheet.invalidateDetents()
      }
    }
  }

  func getCurrentDetentIdentifier() -> UISheetPresentationController.Detent.Identifier? {
    return self.currentSheet?.selectedDetentIdentifier
  }

  private func configure(_ sheet: UISheetPresentationController) {
    sheet.delegate = self
    sheet.prefersGrabberVisible = false
    sheet.preferredCornerRadius = self.preferredCornerRadius
  }

  /// - Parameter keepingExpansion: leave an expanded sheet expanded when its
  ///   content changes, instead of dropping back to the content detent.
  private func applyDetents(to sheet: UISheetPresentationController, keepingExpansion: Bool) {
    let wasExpanded = sheet.selectedDetentIdentifier == .large
    let screenHeight = self.availablePresentationHeight
      ?? Util.getScreenHeight()
      ?? UIScreen.main.bounds.height

    if self.fullHeight {
      sheet.detents = [.large()]
      sheet.selectedDetentIdentifier = .large
      return
    }

    // On iOS 26, the floaty sheet presentation adds the device bottom safe area
    // on top of the custom detent value, creating visible padding inside the pill.
    // Subtract it so the pill height matches our actual content.
    var bottomSafeAreaAdjustment: CGFloat = 0
    if #available(iOS 26.0, *) {
      if let window = self.view.window
          ?? (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.windows.first {
        bottomSafeAreaAdjustment = window.safeAreaInsets.bottom
      }
    }

    let contentHeight = self.contentHeight
    let adjustedHeight = max(1, contentHeight - bottomSafeAreaAdjustment)

    if #available(iOS 16.0, *) {
      if contentHeight > screenHeight - 100 {
        sheet.detents = [.large()]
        sheet.selectedDetentIdentifier = .large
      } else {
        sheet.detents = [
          .custom(identifier: Self.contentDetentIdentifier) { context in
            return min(adjustedHeight, context.maximumDetentValue)
          }
        ]
        if !self.preventExpansion {
          sheet.detents.append(.large())
        }
        let stayExpanded = keepingExpansion && wasExpanded && !self.preventExpansion
        sheet.selectedDetentIdentifier = stayExpanded ? .large : Self.contentDetentIdentifier
      }
    } else {
      if contentHeight > screenHeight / 2 {
        sheet.detents = [.large()]
        sheet.selectedDetentIdentifier = .large
      } else {
        sheet.detents = [.medium()]
        if !self.preventExpansion {
          sheet.detents.append(.large())
        }
        let stayExpanded = keepingExpansion && wasExpanded && !self.preventExpansion
        sheet.selectedDetentIdentifier = stayExpanded ? .large : .medium
      }
    }
  }

  // MARK: - UIAdaptivePresentationControllerDelegate

  func adaptivePresentationStyle(
    for controller: UIPresentationController,
    traitCollection: UITraitCollection
  ) -> UIModalPresentationStyle {
    // A forced popover stays anchored on compact widths. An adaptive one becomes a sheet.
    return self.popoverMode == .always ? .none : .formSheet
  }

  func presentationController(
    _ presentationController: UIPresentationController,
    prepare adaptivePresentationController: UIPresentationController
  ) {
    guard let sheet = adaptivePresentationController as? UISheetPresentationController else {
      return
    }
    self.configure(sheet)
    self.applyDetents(to: sheet, keepingExpansion: false)
  }

  func presentationControllerShouldDismiss(_ presentationController: UIPresentationController) -> Bool {
    self.onAttemptDismiss?()
    return self.onShouldDismiss?() ?? true
  }

  func presentationControllerWillDismiss(_ presentationController: UIPresentationController) {
    self.onWillDismiss?()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    self.onDidDismiss?()
  }

  // MARK: - UISheetPresentationControllerDelegate

  func sheetPresentationControllerDidChangeSelectedDetentIdentifier(
    _ sheetPresentationController: UISheetPresentationController
  ) {
    self.onDetentChange?(sheetPresentationController.selectedDetentIdentifier)
  }
}
