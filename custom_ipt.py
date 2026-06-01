#!/usr/bin/env python3
"""
Custom-IPT — Image Processing Toolbox
A professional desktop image processing application with Adobe CC-grade interface.

Dependencies:
    pip install PySide6 matplotlib numpy Pillow

All image processing algorithms are coded from scratch using only NumPy.
"""

import sys
import math
import time
import numpy as np
from PIL import Image

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QSlider, QFileDialog, QMessageBox,
    QStatusBar, QMenu, QDialog, QRadioButton,
    QButtonGroup, QCheckBox, QComboBox, QGroupBox, QSizePolicy,
    QScrollArea, QSplitter, QSpacerItem, QToolBar, QToolButton,
    QGraphicsView, QGraphicsScene, QGraphicsPixmapItem, QGraphicsLineItem,
    QGraphicsEllipseItem, QTabWidget, QListWidget, QListWidgetItem,
    QFrame, QGridLayout, QWidgetAction, QProgressBar
)
from PySide6.QtGui import (
    QPixmap, QImage, QPainter, QPen, QColor, QAction, QFont,
    QKeySequence, QBrush, QCursor, QIcon, QTransform,
    QPainterPath
)
from PySide6.QtCore import Qt, Signal, QPoint, QSize, QRect, QTimer, QRectF, QObject, QThread
from PySide6.QtSvg import QSvgRenderer

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
from matplotlib.figure import Figure

class IconProvider:
    SVG_PATHS = {
        'folder-open': '<path d="M5 19l2.757-7.351A1 1 0 0 1 8.693 11H21a1 1 0 0 1 .986 1.164l-.996 5.211A1 1 0 0 1 20.004 18H6a1 1 0 0 1-1-1z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v2"/>',
        'floppy': '<path d="M6 4h10l2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M14 4v4H8V4"/>',
        'file-export': '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M11.5 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v5m-5 6h7m-3-3l3 3-3 3"/>',
        'refresh': '<path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
        'arrow-back': '<path d="M5 12h14"/><path d="M5 12l6 6"/><path d="M5 12l6-6"/>',
        'arrow-forward': '<path d="M5 12h14"/><path d="M13 18l6-6"/><path d="M13 6l6 6"/>',
        'zoom': '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/>',
        'zoom-in': '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/><path d="M8 10h4"/><path d="M10 8v4"/>',
        'zoom-out': '<circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/><path d="M8 10h4"/>',
        'arrows-maximize': '<path d="M16 4l4 0l0 4"/><path d="M14 10l6-6"/><path d="M8 20l-4 0l0-4"/><path d="M4 20l6-6"/><path d="M16 20l4 0l0-4"/><path d="M14 14l6 6"/><path d="M8 4l-4 0l0 4"/><path d="M4 4l6 6"/>',
        'hand-move': '<path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V2a1.5 1.5 0 0 1 3 0V12"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0V12"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0V18a6 6 0 0 1-6 6h-2 .208a6 6 0 0 1-5.012-2.7L7 21c-.312-.479-1.407-2.388-3.286-5.728a1.5 1.5 0 0 1 .536-2.022 1.867 1.867 0 0 1 2.28.28L8 15"/>',
        'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>',
        'chart-bar': '<rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/>',
        'adjustments': '<circle cx="6" cy="10" r="2"/><line x1="6" y1="4" x2="6" y2="8"/><line x1="6" y1="12" x2="6" y2="20"/><circle cx="12" cy="16" r="2"/><line x1="12" y1="4" x2="12" y2="14"/><line x1="12" y1="18" x2="12" y2="20"/><circle cx="18" cy="7" r="2"/><line x1="18" y1="4" x2="18" y2="5"/><line x1="18" y1="9" x2="18" y2="20"/>',
        'grid-dots': '<circle cx="5" cy="5" r="1" fill="{color}"/><circle cx="12" cy="5" r="1" fill="{color}"/><circle cx="19" cy="5" r="1" fill="{color}"/><circle cx="5" cy="12" r="1" fill="{color}"/><circle cx="12" cy="12" r="1" fill="{color}"/><circle cx="19" cy="12" r="1" fill="{color}"/><circle cx="5" cy="19" r="1" fill="{color}"/><circle cx="12" cy="19" r="1" fill="{color}"/><circle cx="19" cy="19" r="1" fill="{color}"/>',
        'layout-grid': '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
        'circle-dot': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/>',
        'arrows-horizontal': '<path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/><path d="M3 12h18"/>',
        'arrows-diagonal': '<path d="M16 4l4 0l0 4"/><path d="M14 10l6-6"/><path d="M8 20l-4 0l0-4"/><path d="M4 20l6-6"/>',
        'diamond': '<path d="M12 3l9 9-9 9-9-9z"/>',
        'sparkles': '<path d="M16 18a2 2 0 0 1 2-2 2 2 0 0 1-2-2 2 2 0 0 1-2 2 2 2 0 0 1 2 2z"/><path d="M9 12a4 4 0 0 1 4-4 4 4 0 0 1-4-4 4 4 0 0 1-4 4 4 4 0 0 1 4 4z"/>',
        'minus-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 12h6"/>',
        'plus-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 12h6"/><path d="M12 9v6"/>',
        'circle-off': '<path d="M20.042 16.045A9 9 0 0 0 7.955 3.958"/><path d="M3.958 7.955A9 9 0 0 0 16.045 20.042"/><path d="M3 3l18 18"/>',
        'circle': '<circle cx="12" cy="12" r="9"/>',
        'bone': '<path d="M15.78 4.22a3 3 0 0 1 3.99 3.99L12 16l-7.78-7.78a3 3 0 0 1 3.99-3.99L12 8z"/><path d="M8.22 19.78a3 3 0 0 1-3.99-3.99L12 8l7.78 7.78a3 3 0 0 1-3.99 3.99L12 16z"/>',
        'chart-histogram': '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="7"/><rect x="12" y="8" width="3" height="11"/><rect x="17" y="5" width="3" height="14"/>',
        'trending-up': '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/>',
        'ruler': '<path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M4 8h3"/><path d="M4 12h5"/><path d="M4 16h3"/><path d="M20 8h-3"/><path d="M20 12h-5"/><path d="M20 16h-3"/>',
        'check': '<path d="M5 12l5 5L20 7"/>',
        'x': '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
        'trash': '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
        'rectangle-dashed': '<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2-2v-2"/>',
        'pencil': '<path d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-4-4L4 16v4"/><path d="M13.5 6.5l4 4"/>',
        'eyedropper': '<path d="M11 7l6 6"/><path d="M4 16l11.7-11.7a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4L8 20H4v-4z"/>'
    }
    
    @staticmethod
    def get_icon(name, color='#ABABAB', size=16):
        paths = IconProvider.SVG_PATHS.get(name, '')
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">{paths}</svg>'
        svg = svg.replace('{color}', color)
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.transparent)
        renderer = QSvgRenderer(svg.encode('utf-8'))
        painter = QPainter(pixmap)
        renderer.render(painter)
        painter.end()
        return QIcon(pixmap)

class ImageProcessor:
    """All numpy-based image processing algorithms as static methods."""

    @staticmethod
    def to_grayscale(img):
        """gray = 0.299*R + 0.587*G + 0.114*B"""
        if img.ndim == 2:
            return img.copy()
        return np.clip(
            0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2],
            0, 255
        ).astype(np.uint8)

    @staticmethod
    def rgb_to_hsv(img):
        rgb = img.astype(np.float64) / 255.0
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        cmax = np.max(rgb, axis=2)
        cmin = np.min(rgb, axis=2)
        delta = cmax - cmin
        h = np.zeros_like(cmax)
        mask_r = (cmax == r) & (delta > 0)
        mask_g = (cmax == g) & (delta > 0)
        mask_b = (cmax == b) & (delta > 0)
        h[mask_r] = 60.0 * (((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6)
        h[mask_g] = 60.0 * (((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2)
        h[mask_b] = 60.0 * (((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4)
        s = np.zeros_like(cmax)
        np.divide(delta, cmax, out=s, where=(cmax > 0))
        v = cmax
        return np.stack([h, s, v], axis=2)

    @staticmethod
    def hsv_to_rgb(hsv):
        h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
        c = v * s
        x = c * (1.0 - np.abs((h / 60.0) % 2 - 1.0))
        m = v - c
        r = np.zeros_like(h); g = np.zeros_like(h); b = np.zeros_like(h)
        mask0 = (h >= 0) & (h < 60);   r[mask0], g[mask0], b[mask0] = c[mask0], x[mask0], 0
        mask1 = (h >= 60) & (h < 120); r[mask1], g[mask1], b[mask1] = x[mask1], c[mask1], 0
        mask2 = (h >= 120) & (h < 180); r[mask2], g[mask2], b[mask2] = 0, c[mask2], x[mask2]
        mask3 = (h >= 180) & (h < 240); r[mask3], g[mask3], b[mask3] = 0, x[mask3], c[mask3]
        mask4 = (h >= 240) & (h < 300); r[mask4], g[mask4], b[mask4] = x[mask4], 0, c[mask4]
        mask5 = (h >= 300) & (h < 360); r[mask5], g[mask5], b[mask5] = c[mask5], 0, x[mask5]
        rgb = np.stack([r + m, g + m, b + m], axis=2)
        return np.clip(rgb * 255, 0, 255).astype(np.uint8)

    @staticmethod
    def adjust_contrast_brightness(img, alpha=1.0, beta=0):
        return np.clip(alpha * img.astype(np.float64) + beta, 0, 255).astype(np.uint8)

    @staticmethod
    def histogram_equalization(img):
        def _equalize_channel(ch):
            hist = np.zeros(256, dtype=np.int64)
            for val in range(256):
                hist[val] = np.sum(ch == val)
            cdf = np.cumsum(hist)
            cdf_min = cdf[cdf > 0].min() if np.any(cdf > 0) else 0
            denom = ch.size - cdf_min
            if denom == 0:
                return ch.copy()
            lut = np.clip(np.round((cdf - cdf_min) / denom * 255.0), 0, 255).astype(np.uint8)
            return lut[ch]
        if img.ndim == 2:
            return _equalize_channel(img)
        else:
            hsv = ImageProcessor.rgb_to_hsv(img)
            v_channel = np.clip(hsv[:, :, 2] * 255, 0, 255).astype(np.uint8)
            v_eq = _equalize_channel(v_channel)
            hsv[:, :, 2] = v_eq.astype(np.float64) / 255.0
            return ImageProcessor.hsv_to_rgb(hsv)

    @staticmethod
    def otsu_threshold(img):
        gray = ImageProcessor.to_grayscale(img)
        total = gray.size
        hist = np.zeros(256, dtype=np.float64)
        for val in range(256):
            hist[val] = np.sum(gray == val)
        p = hist / total
        best_t, best_var = 0, 0.0
        for t in range(256):
            w0 = np.sum(p[:t + 1]); w1 = np.sum(p[t + 1:])
            if w0 == 0 or w1 == 0:
                continue
            mu0 = np.sum(np.arange(t + 1) * p[:t + 1]) / w0
            mu1 = np.sum(np.arange(t + 1, 256) * p[t + 1:]) / w1
            var_between = w0 * w1 * (mu0 - mu1) ** 2
            if var_between > best_var:
                best_var = var_between; best_t = t
        binary = np.where(gray > best_t, 255, 0).astype(np.uint8)
        return binary, best_t

    @staticmethod
    def convolve2d(image, kernel, padding='reflect'):
        def _conv_channel(ch, kern):
            kh, kw = kern.shape
            ph, pw = kh // 2, kw // 2
            padded = np.pad(ch.astype(np.float64), ((ph, ph), (pw, pw)), mode=padding)
            h, w = ch.shape
            shape = (h, w, kh, kw)
            strides = padded.strides * 2
            windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)
            return np.einsum('ijkl,kl->ij', windows, kern)
        if image.ndim == 2:
            return np.clip(_conv_channel(image, kernel), 0, 255).astype(np.uint8)
        else:
            channels = [_conv_channel(image[:, :, c], kernel) for c in range(image.shape[2])]
            return np.clip(np.stack(channels, axis=2), 0, 255).astype(np.uint8)

    @staticmethod
    def box_filter(img, k=3):
        return ImageProcessor.convolve2d(img, np.ones((k, k), dtype=np.float64) / (k * k))

    @staticmethod
    def median_filter(img, k=3):
        def _median_ch(ch, k):
            pad = k // 2
            padded = np.pad(ch.astype(np.float64), pad, mode='reflect')
            h, w = ch.shape
            shape = (h, w, k, k)
            strides = padded.strides * 2
            windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)
            return np.median(windows.reshape(h, w, k * k), axis=2)
        if img.ndim == 2:
            return np.clip(_median_ch(img, k), 0, 255).astype(np.uint8)
        else:
            chs = [_median_ch(img[:, :, c], k) for c in range(img.shape[2])]
            return np.clip(np.stack(chs, axis=2), 0, 255).astype(np.uint8)

    @staticmethod
    def gaussian_kernel(size, sigma):
        ax = np.linspace(-(size // 2), size // 2, size)
        xx, yy = np.meshgrid(ax, ax)
        kernel = np.exp(-(xx ** 2 + yy ** 2) / (2 * sigma ** 2))
        return kernel / kernel.sum()

    @staticmethod
    def gaussian_filter(img, k=3, sigma=1.0):
        return ImageProcessor.convolve2d(img, ImageProcessor.gaussian_kernel(k, sigma))

    @staticmethod
    def _conv_float(gray, kern):
        kh, kw = kern.shape
        ph, pw = kh // 2, kw // 2
        padded = np.pad(gray.astype(np.float64), ((ph, ph), (pw, pw)), mode='reflect')
        h, w = gray.shape
        shape = (h, w, kh, kw)
        strides = padded.strides * 2
        windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)
        return np.einsum('ijkl,kl->ij', windows, kern)

    @staticmethod
    def sobel(img, mode='magnitude'):
        gray = ImageProcessor.to_grayscale(img)
        kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64)
        ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64)
        gx = ImageProcessor._conv_float(gray, kx)
        gy = ImageProcessor._conv_float(gray, ky)
        if mode == 'gx': result = np.abs(gx)
        elif mode == 'gy': result = np.abs(gy)
        else: result = np.sqrt(gx ** 2 + gy ** 2)
        rmax = result.max()
        if rmax > 0: result = result / rmax * 255.0
        return np.clip(result, 0, 255).astype(np.uint8)

    @staticmethod
    def prewitt(img, mode='magnitude'):
        gray = ImageProcessor.to_grayscale(img)
        kx = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float64)
        ky = np.array([[-1, -1, -1], [0, 0, 0], [1, 1, 1]], dtype=np.float64)
        gx = ImageProcessor._conv_float(gray, kx)
        gy = ImageProcessor._conv_float(gray, ky)
        if mode == 'gx': result = np.abs(gx)
        elif mode == 'gy': result = np.abs(gy)
        else: result = np.sqrt(gx ** 2 + gy ** 2)
        rmax = result.max()
        if rmax > 0: result = result / rmax * 255.0
        return np.clip(result, 0, 255).astype(np.uint8)

    @staticmethod
    def laplacian(img, connected=4):
        gray = ImageProcessor.to_grayscale(img)
        kernel = (np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], dtype=np.float64)
                  if connected == 8 else
                  np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], dtype=np.float64))
        lapl = ImageProcessor.convolve2d(gray, kernel)
        return np.clip(gray.astype(np.float64) + lapl.astype(np.float64), 0, 255).astype(np.uint8)

    @staticmethod
    def unsharp_mask(img, amount=1.0, sigma=1.0):
        blurred = ImageProcessor.gaussian_filter(img, k=5, sigma=sigma)
        detail = img.astype(np.float64) - blurred.astype(np.float64)
        return np.clip(img.astype(np.float64) + amount * detail, 0, 255).astype(np.uint8)

    @staticmethod
    def get_structuring_element(shape='square', size=3):
        if shape == 'square':
            return np.ones((size, size), dtype=np.uint8)
        se = np.zeros((size, size), dtype=np.uint8)
        se[size // 2, :] = 1; se[:, size // 2] = 1
        return se

    @staticmethod
    def erode(binary_img, se):
        img = binary_img.astype(np.float64) / 255.0
        kh, kw = se.shape
        ph, pw = kh // 2, kw // 2
        padded = np.pad(img, ((ph, ph), (pw, pw)), mode='constant', constant_values=0)
        h, w = binary_img.shape[:2]
        shape = (h, w, kh, kw); strides = padded.strides * 2
        windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)
        return (np.min(windows[:, :, se.astype(bool)], axis=2) * 255).astype(np.uint8)

    @staticmethod
    def dilate(binary_img, se):
        img = binary_img.astype(np.float64) / 255.0
        kh, kw = se.shape
        ph, pw = kh // 2, kw // 2
        padded = np.pad(img, ((ph, ph), (pw, pw)), mode='constant', constant_values=0)
        h, w = binary_img.shape[:2]
        shape = (h, w, kh, kw); strides = padded.strides * 2
        windows = np.lib.stride_tricks.as_strided(padded, shape=shape, strides=strides)
        return (np.max(windows[:, :, se.astype(bool)], axis=2) * 255).astype(np.uint8)

    @staticmethod
    def opening(binary_img, se):
        return ImageProcessor.dilate(ImageProcessor.erode(binary_img, se), se)

    @staticmethod
    def closing(binary_img, se):
        return ImageProcessor.erode(ImageProcessor.dilate(binary_img, se), se)

    @staticmethod
    def zhang_suen_skeleton(img):
        gray = ImageProcessor.to_grayscale(img)
        _, thresh = ImageProcessor.otsu_threshold(gray)
        binary = (gray > thresh).astype(np.uint8)
        skeleton = binary.copy(); h, w = skeleton.shape
        def _neighbors(skel, i, j):
            return (skel[i-1,j], skel[i-1,j+1], skel[i,j+1], skel[i+1,j+1],
                    skel[i+1,j], skel[i+1,j-1], skel[i,j-1], skel[i-1,j-1])
        def _transitions(n):
            n2 = n + (n[0],)
            return sum(1 for k in range(len(n2)-1) if n2[k]==0 and n2[k+1]==1)
        changed = True
        while changed:
            changed = False
            for sub in (1, 2):
                to_del = []
                for i in range(1, h - 1):
                    for j in range(1, w - 1):
                        if skeleton[i, j] != 1: continue
                        ns = _neighbors(skeleton, i, j)
                        p2,p3,p4,p5,p6,p7,p8,p9 = ns
                        B = sum(ns)
                        if B < 2 or B > 6: continue
                        if _transitions(ns) != 1: continue
                        if sub == 1:
                            if p2*p4*p6 != 0: continue
                            if p4*p6*p8 != 0: continue
                        else:
                            if p2*p4*p8 != 0: continue
                            if p2*p6*p8 != 0: continue
                        to_del.append((i, j))
                for i, j in to_del:
                    skeleton[i, j] = 0; changed = True
        return (skeleton * 255).astype(np.uint8)

    @staticmethod
    def bresenham_line(x0, y0, x1, y1):
        points = []
        dx, dy = abs(x1-x0), abs(y1-y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            points.append((x0, y0))
            if x0 == x1 and y0 == y1: break
            e2 = 2 * err
            if e2 > -dy: err -= dy; x0 += sx
            if e2 < dx:  err += dx; y0 += sy
        return points

class ProcessingWorker(QObject):
    """Worker for running image processing in a background thread."""
    finished = Signal(object, str)   # (result_array_or_tuple, op_name)
    error = Signal(str)
    progress = Signal(int)           # 0-100

    def __init__(self, func, image, op_name, kwargs=None):
        super().__init__()
        self.func = func
        self.image = image.copy()
        self.op_name = op_name
        self.kwargs = kwargs or {}

    def run(self):
        try:
            self.progress.emit(30)
            result = self.func(self.image, **self.kwargs)
            self.progress.emit(90)
            self.finished.emit(result, self.op_name)
        except Exception as e:
            self.error.emit(str(e))

class HistoryStack:
    """Undo/redo stack storing image states."""
    def __init__(self, max_size=20):
        self.stack = []  # list of (name: str, image: np.ndarray)
        self.index = -1
        self.max_size = max_size

    def push(self, name, image):
        # Remove any redo entries
        self.stack = self.stack[:self.index + 1]
        self.stack.append((name, image.copy()))
        if len(self.stack) > self.max_size:
            self.stack.pop(0)
        self.index = len(self.stack) - 1

    def undo(self):
        if self.index > 0:
            self.index -= 1
            name, img = self.stack[self.index]
            return name, img.copy()
        return None

    def redo(self):
        if self.index < len(self.stack) - 1:
            self.index += 1
            name, img = self.stack[self.index]
            return name, img.copy()
        return None

    def get_at(self, index):
        if 0 <= index < len(self.stack):
            name, img = self.stack[index]
            self.index = index
            return name, img.copy()
        return None

    def clear(self):
        self.stack.clear()
        self.index = -1

    def entries(self):
        return [(name, i) for i, (name, _) in enumerate(self.stack)]

    def current_index(self):
        return self.index

    def __len__(self):
        return len(self.stack)

def ndarray_to_qpixmap(arr):
    """Convert numpy array to QPixmap safely."""
    if arr is None:
        return QPixmap()
    if arr.ndim == 2:
        h, w = arr.shape
        bytes_per_line = w
        qimg = QImage(arr.data.tobytes(), w, h, bytes_per_line, QImage.Format_Grayscale8)
    elif arr.ndim == 3:
        h, w, c = arr.shape
        bytes_per_line = w * c
        qimg = QImage(arr.data.tobytes(), w, h, bytes_per_line, QImage.Format_RGB888)
    else:
        return QPixmap()
    return QPixmap.fromImage(qimg.copy())

class ZoomableImageView(QGraphicsView):
    """Professional image viewer with zoom, pan, and coordinate tracking."""
    coord_changed = Signal(int, int)
    point_clicked = Signal(int, int)
    zoom_changed = Signal(float)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scene = QGraphicsScene(self)
        self.setScene(self._scene)
        self._pixmap_item = QGraphicsPixmapItem()
        self._scene.addItem(self._pixmap_item)
        self._image_array = None
        self._zoom = 1.0
        self._click_mode = False

        self.setMouseTracking(True)
        self.setRenderHint(QPainter.SmoothPixmapTransform)
        self.setDragMode(QGraphicsView.ScrollHandDrag)
        self.setTransformationAnchor(QGraphicsView.AnchorUnderMouse)
        self.setResizeAnchor(QGraphicsView.AnchorViewCenter)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.setViewportUpdateMode(QGraphicsView.FullViewportUpdate)
        self.setBackgroundBrush(QBrush(QColor('#1A1A1A')))
        self.setFrameShape(QFrame.NoFrame)
        self._overlay_items = []

    def set_image(self, np_array):
        self._image_array = np_array
        if np_array is None:
            self._pixmap_item.setPixmap(QPixmap())
            return
        self._pixmap_item.setPixmap(ndarray_to_qpixmap(np_array))
        self._scene.setSceneRect(self._pixmap_item.boundingRect())

    def set_zoom(self, zoom):
        factor = zoom / self._zoom
        self._zoom = zoom
        self.scale(factor, factor)
        self.zoom_changed.emit(self._zoom)

    def fit_to_view(self):
        if self._pixmap_item.pixmap().isNull():
            return
        self.resetTransform()
        self._zoom = 1.0
        self.fitInView(self._pixmap_item, Qt.KeepAspectRatio)
        t = self.transform()
        self._zoom = t.m11()
        self.zoom_changed.emit(self._zoom)

    def actual_size(self):
        self.resetTransform()
        self._zoom = 1.0
        self.zoom_changed.emit(self._zoom)

    def wheelEvent(self, event):
        factor = 1.15 if event.angleDelta().y() > 0 else 1.0 / 1.15
        self._zoom *= factor
        self.scale(factor, factor)
        self.zoom_changed.emit(self._zoom)

    def mouseMoveEvent(self, event):
        pos = self.mapToScene(event.position().toPoint())
        x, y = int(pos.x()), int(pos.y())
        if self._image_array is not None:
            h, w = self._image_array.shape[:2]
            if 0 <= x < w and 0 <= y < h:
                self.coord_changed.emit(x, y)
        super().mouseMoveEvent(event)

    def mousePressEvent(self, event):
        if self._click_mode and event.button() == Qt.LeftButton:
            pos = self.mapToScene(event.position().toPoint())
            x, y = int(pos.x()), int(pos.y())
            if self._image_array is not None:
                h, w = self._image_array.shape[:2]
                if 0 <= x < w and 0 <= y < h:
                    self.point_clicked.emit(x, y)
                    return
        super().mousePressEvent(event)

    def clear_overlays(self):
        for item in self._overlay_items:
            self._scene.removeItem(item)
        self._overlay_items.clear()

    def add_point_overlay(self, x, y, color='#FF4444', radius=4):
        ellipse = self._scene.addEllipse(
            x - radius, y - radius, radius * 2, radius * 2,
            QPen(QColor(color), 1.5), QBrush(QColor(color))
        )
        self._overlay_items.append(ellipse)

    def add_line_overlay(self, x0, y0, x1, y1, color='#FF4444', width=2, dashed=False):
        pen = QPen(QColor(color), width)
        if dashed:
            pen.setStyle(Qt.DashLine)
        line = self._scene.addLine(x0, y0, x1, y1, pen)
        self._overlay_items.append(line)

class MplCanvas(FigureCanvasQTAgg):
    """Dark-themed Matplotlib canvas."""
    def __init__(self, parent=None, width=5, height=3, dpi=90):
        self.fig = Figure(figsize=(width, height), dpi=dpi, facecolor='#1E1E1E')
        self.fig.subplots_adjust(left=0.08, right=0.96, top=0.95, bottom=0.15)
        self.axes = self.fig.add_subplot(111)
        self.axes.set_facecolor('#1E1E1E')
        super().__init__(self.fig)
        self.setParent(parent)
        self._style_axes()

    def _style_axes(self):
        for spine in self.axes.spines.values():
            spine.set_color('#3A3A3A')
        self.axes.tick_params(colors='#555555', labelsize=9, labelcolor='#777777')
        self.axes.xaxis.label.set_color('#777777')
        self.axes.yaxis.label.set_color('#777777')
        self.axes.grid(True, color='#2A2A2A', linestyle='--', alpha=0.5)

class HistogramWidget(MplCanvas):
    """Histogram display matching Adobe CC dark theme."""
    def __init__(self, parent=None):
        super().__init__(parent, width=4.5, height=2.2)

    def update_histogram(self, img):
        self.axes.clear()
        self._style_axes()
        if img is None:
            self.draw()
            return
        bins = np.arange(257)
        if img.ndim == 2:
            hist, _ = np.histogram(img.ravel(), bins=bins)
            self.axes.fill_between(np.arange(256), hist, alpha=0.6, color='#B0B0B0')
            self.axes.plot(np.arange(256), hist, color='#D0D0D0', linewidth=0.8)
        else:
            for c, clr in enumerate(['#FF6060', '#60FF60', '#6090FF']):
                hist, _ = np.histogram(img[:, :, c].ravel(), bins=bins)
                self.axes.fill_between(np.arange(256), hist, alpha=0.3, color=clr)
                self.axes.plot(np.arange(256), hist, color=clr, linewidth=0.8,
                               label=['R', 'G', 'B'][c], alpha=0.7)
            self.axes.legend(fontsize=8, loc='upper right',
                             facecolor='#1E1E1E', edgecolor='#3A3A3A', labelcolor='#ABABAB')
        self.axes.set_xlim(0, 255)
        # Format Y axis with K suffix
        from matplotlib.ticker import FuncFormatter
        self.axes.yaxis.set_major_formatter(FuncFormatter(lambda x, p: f'{x/1000:.0f}K' if x >= 1000 else f'{x:.0f}'))
        self.axes.set_xticks([0, 64, 128, 192, 255])
        self.fig.tight_layout(pad=0.5)
        self.draw()

class LineProfileWidget(MplCanvas):
    """Line profile graph."""
    def __init__(self, parent=None):
        super().__init__(parent, width=5, height=2.2)

    def plot_profile(self, img, points):
        self.axes.clear()
        self._style_axes()
        if img is None or not points:
            self.draw()
            return
        h, w = img.shape[:2]
        valid = [(px, py) for px, py in points if 0 <= px < w and 0 <= py < h]
        if not valid:
            self.draw()
            return
        if img.ndim == 2:
            vals = [int(img[py, px]) for px, py in valid]
            self.axes.plot(vals, color='#4CA3FF', linewidth=1.5)
        else:
            for c, clr in enumerate(['#FF6060', '#60FF60', '#6090FF']):
                vals = [int(img[py, px, c]) for px, py in valid]
                self.axes.plot(vals, color=clr, linewidth=1.0, label=['R', 'G', 'B'][c])
            self.axes.legend(fontsize=8, loc='upper right',
                             facecolor='#1E1E1E', edgecolor='#3A3A3A', labelcolor='#ABABAB')
        self.axes.set_xlabel('Distance (pixels)', fontsize=9, color='#777777')
        self.axes.set_ylabel('Intensité', fontsize=9, color='#777777')
        self.axes.set_ylim(0, 255)
        self.axes.set_yticks([0, 64, 128, 192, 255])
        self.fig.tight_layout(pad=0.5)
        self.draw()

class AnalysisPanel(QWidget):
    """Bottom analysis panel with custom tabs."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(240)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Tab bar
        tab_bar = QWidget()
        tab_bar.setFixedHeight(36)
        tab_bar.setStyleSheet('background: #252525; border-bottom: 1px solid #3A3A3A;')
        tab_layout = QHBoxLayout(tab_bar)
        tab_layout.setContentsMargins(0, 0, 0, 0)
        tab_layout.setSpacing(0)

        self._tab_buttons = []
        self._tab_names = ['HISTOGRAMME', 'PROFIL DE LIGNE', 'MESURE DE DISTANCE']
        for i, name in enumerate(self._tab_names):
            btn = QPushButton(name)
            btn.setCheckable(True)
            btn.setChecked(i == 0)
            btn.setFixedHeight(36)
            btn.setStyleSheet(self._tab_style(i == 0))
            btn.clicked.connect(lambda checked, idx=i: self._switch_tab(idx))
            tab_layout.addWidget(btn)
            self._tab_buttons.append(btn)
        tab_layout.addStretch()
        layout.addWidget(tab_bar)

        # ── Tab 0: Histogram ──
        self.hist_page = QWidget()
        hist_layout = QHBoxLayout(self.hist_page)
        hist_layout.setContentsMargins(8, 8, 8, 8)
        hist_layout.setSpacing(12)

        # Histogram graph (~55%)
        self.histogram = HistogramWidget()
        hist_layout.addWidget(self.histogram, stretch=55)

        # Statistics panel (~20%)
        stats_widget = QWidget()
        stats_widget.setStyleSheet('background: transparent;')
        stats_layout = QVBoxLayout(stats_widget)
        stats_layout.setContentsMargins(8, 4, 8, 4)
        stats_layout.setSpacing(2)

        stats_title = QLabel('STATISTIQUES')
        stats_title.setStyleSheet('color: #ABABAB; font-size: 10px; font-weight: bold; letter-spacing: 1px;')
        stats_layout.addWidget(stats_title)

        self.stat_labels = {}
        stats_grid = QGridLayout()
        stats_grid.setSpacing(4)
        for i, (key, name) in enumerate([('min', 'Min'), ('max', 'Max'),
                                          ('mean', 'Moyenne'), ('median', 'Médiane'),
                                          ('std', 'Écart type')]):
            lbl = QLabel(name)
            lbl.setStyleSheet('color: #777777; font-size: 11px;')
            val = QLabel('—')
            val.setStyleSheet('color: #E8E8E8; font-size: 11px; font-family: "Cascadia Code", "Consolas", monospace;')
            val.setAlignment(Qt.AlignRight)
            stats_grid.addWidget(lbl, i, 0)
            stats_grid.addWidget(val, i, 1)
            self.stat_labels[key] = val
        stats_layout.addLayout(stats_grid)
        stats_layout.addStretch()
        hist_layout.addWidget(stats_widget, stretch=20)

        # 100% preview (~25%)
        preview_widget = QWidget()
        preview_widget.setStyleSheet('background: transparent;')
        preview_layout = QVBoxLayout(preview_widget)
        preview_layout.setContentsMargins(4, 4, 4, 4)
        preview_layout.setSpacing(4)

        preview_title = QLabel('APERÇU 100%')
        preview_title.setStyleSheet('color: #ABABAB; font-size: 10px; font-weight: bold; letter-spacing: 1px;')
        preview_layout.addWidget(preview_title)

        self.preview_label = QLabel()
        self.preview_label.setFixedSize(150, 100)
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.setStyleSheet('background: #1A1A1A; border: 1px solid #3A3A3A;')
        preview_layout.addWidget(self.preview_label)
        preview_layout.addStretch()
        hist_layout.addWidget(preview_widget, stretch=25)

        # ── Tab 1: Line Profile ──
        self.profile_page = QWidget()
        profile_layout = QHBoxLayout(self.profile_page)
        profile_layout.setContentsMargins(8, 8, 8, 8)
        profile_layout.setSpacing(12)

        self.profile_widget = LineProfileWidget()
        profile_layout.addWidget(self.profile_widget, stretch=65)

        # Thumbnail + info
        profile_info_widget = QWidget()
        profile_info_layout = QVBoxLayout(profile_info_widget)
        profile_info_layout.setContentsMargins(4, 4, 4, 4)
        profile_info_layout.setSpacing(4)

        self.profile_thumbnail = QLabel()
        self.profile_thumbnail.setFixedSize(170, 120)
        self.profile_thumbnail.setAlignment(Qt.AlignCenter)
        self.profile_thumbnail.setStyleSheet('background: #1A1A1A; border: 1px solid #3A3A3A;')
        profile_info_layout.addWidget(self.profile_thumbnail)

        self.profile_coords = QLabel('A: — → B: —')
        self.profile_coords.setStyleSheet('color: #777777; font-size: 10px;')
        profile_info_layout.addWidget(self.profile_coords)

        self.profile_length = QLabel('Longueur: —')
        self.profile_length.setStyleSheet('color: #ABABAB; font-size: 10px;')
        profile_info_layout.addWidget(self.profile_length)
        profile_info_layout.addStretch()
        profile_layout.addWidget(profile_info_widget, stretch=35)

        # ── Tab 2: Distance ──
        self.distance_page = QWidget()
        dist_layout = QHBoxLayout(self.distance_page)
        dist_layout.setContentsMargins(20, 12, 20, 12)
        dist_layout.setSpacing(24)

        # Left: large readout
        dist_left = QVBoxLayout()
        dist_left.setAlignment(Qt.AlignCenter)
        self.dist_value = QLabel('—')
        self.dist_value.setStyleSheet('color: #E8E8E8; font-size: 36px; font-weight: bold;')
        self.dist_value.setAlignment(Qt.AlignCenter)
        self.dist_unit = QLabel('pixels')
        self.dist_unit.setStyleSheet('color: #777777; font-size: 14px;')
        self.dist_unit.setAlignment(Qt.AlignCenter)
        dist_left.addStretch()
        dist_left.addWidget(self.dist_value)
        dist_left.addWidget(self.dist_unit)
        dist_left.addStretch()
        dist_layout.addLayout(dist_left, stretch=40)

        # Right: details grid
        dist_details = QWidget()
        dist_grid = QGridLayout(dist_details)
        dist_grid.setSpacing(6)
        self.dist_labels = {}
        for i, (key, name) in enumerate([('pointA', 'Point A'), ('pointB', 'Point B'),
                                          ('dx', 'ΔX'), ('dy', 'ΔY'),
                                          ('distance', 'Distance'), ('angle', 'Angle')]):
            lbl = QLabel(name)
            lbl.setStyleSheet('color: #777777; font-size: 11px;')
            val = QLabel('—')
            val.setStyleSheet('color: #E8E8E8; font-size: 11px; font-family: "Cascadia Code", "Consolas", monospace;')
            val.setAlignment(Qt.AlignRight)
            dist_grid.addWidget(lbl, i, 0)
            dist_grid.addWidget(val, i, 1)
            self.dist_labels[key] = val
        dist_layout.addWidget(dist_details, stretch=35)

        # Thumbnail
        self.dist_thumbnail = QLabel()
        self.dist_thumbnail.setFixedSize(150, 100)
        self.dist_thumbnail.setAlignment(Qt.AlignCenter)
        self.dist_thumbnail.setStyleSheet('background: #1A1A1A; border: 1px solid #3A3A3A;')
        dist_layout.addWidget(self.dist_thumbnail, stretch=25)

        # Stacked pages
        self._pages = [self.hist_page, self.profile_page, self.distance_page]
        self._current = 0
        for page in self._pages:
            layout.addWidget(page)
        self.profile_page.hide()
        self.distance_page.hide()

    def _tab_style(self, active):
        if active:
            return ('QPushButton { background: transparent; color: #E8E8E8; font-size: 11px; '
                    'font-weight: bold; letter-spacing: 0.8px; border: none; '
                    'border-bottom: 2px solid #1473E6; padding: 0 20px; }')
        return ('QPushButton { background: transparent; color: #606060; font-size: 11px; '
                'font-weight: bold; letter-spacing: 0.8px; border: none; '
                'border-bottom: 2px solid transparent; padding: 0 20px; }'
                'QPushButton:hover { color: #ABABAB; }')

    def _switch_tab(self, idx):
        self._current = idx
        for i, (btn, page) in enumerate(zip(self._tab_buttons, self._pages)):
            btn.setChecked(i == idx)
            btn.setStyleSheet(self._tab_style(i == idx))
            page.setVisible(i == idx)

    def setCurrentIndex(self, idx):
        self._switch_tab(idx)

    def update_stats(self, img):
        if img is None:
            for v in self.stat_labels.values():
                v.setText('—')
            return
        gray = img if img.ndim == 2 else ImageProcessor.to_grayscale(img)
        self.stat_labels['min'].setText(str(int(gray.min())))
        self.stat_labels['max'].setText(str(int(gray.max())))
        self.stat_labels['mean'].setText(f'{np.mean(gray):.2f}')
        self.stat_labels['median'].setText(str(int(np.median(gray))))
        self.stat_labels['std'].setText(f'{np.std(gray):.2f}')

    def update_preview(self, img):
        if img is None:
            self.preview_label.clear()
            return
        h, w = img.shape[:2]
        cx, cy = w // 2, h // 2
        pw, ph = min(150, w), min(100, h)
        x0 = max(0, cx - pw // 2)
        y0 = max(0, cy - ph // 2)
        crop = img[y0:y0+ph, x0:x0+pw]
        if crop.size == 0:
            return
        pm = ndarray_to_qpixmap(crop)
        self.preview_label.setPixmap(pm.scaled(
            self.preview_label.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation))

    def update_distance(self, x0, y0, x1, y1, img=None):
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        dist = math.sqrt(dx**2 + dy**2)
        angle = math.degrees(math.atan2(dy, dx))
        self.dist_value.setText(f'{dist:.1f}')
        self.dist_labels['pointA'].setText(f'({x0}, {y0})')
        self.dist_labels['pointB'].setText(f'({x1}, {y1})')
        self.dist_labels['dx'].setText(f'{dx} px')
        self.dist_labels['dy'].setText(f'{dy} px')
        self.dist_labels['distance'].setText(f'{dist:.1f} px')
        self.dist_labels['angle'].setText(f'{angle:.1f}°')
        # Update thumbnail if image available
        if img is not None:
            pm = ndarray_to_qpixmap(img)
            scaled = pm.scaled(150, 100, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            # Draw overlay
            painter = QPainter(scaled)
            painter.setRenderHint(QPainter.Antialiasing)
            sx = scaled.width() / pm.width() if pm.width() > 0 else 1
            sy = scaled.height() / pm.height() if pm.height() > 0 else 1
            pen = QPen(QColor('#FF4444'), 2)
            pen.setStyle(Qt.DashLine)
            painter.setPen(pen)
            painter.drawLine(int(x0*sx), int(y0*sy), int(x1*sx), int(y1*sy))
            painter.setBrush(QBrush(QColor('#FF4444')))
            painter.setPen(Qt.NoPen)
            painter.drawEllipse(int(x0*sx)-3, int(y0*sy)-3, 6, 6)
            painter.drawEllipse(int(x1*sx)-3, int(y1*sy)-3, 6, 6)
            painter.end()
            self.dist_thumbnail.setPixmap(scaled)

    def update_profile_info(self, x0, y0, x1, y1, num_points, img=None):
        self.profile_coords.setText(f'A: ({x0}, {y0})  →  B: ({x1}, {y1})')
        self.profile_length.setText(f'Longueur: {num_points} pixels')
        # Update thumbnail
        if img is not None:
            pm = ndarray_to_qpixmap(img)
            scaled = pm.scaled(170, 120, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            painter = QPainter(scaled)
            painter.setRenderHint(QPainter.Antialiasing)
            sx = scaled.width() / pm.width() if pm.width() > 0 else 1
            sy = scaled.height() / pm.height() if pm.height() > 0 else 1
            pen = QPen(QColor('#FF4444'), 2)
            painter.setPen(pen)
            painter.drawLine(int(x0*sx), int(y0*sy), int(x1*sx), int(y1*sy))
            painter.setBrush(QBrush(QColor('#FF4444')))
            painter.setPen(Qt.NoPen)
            painter.drawEllipse(int(x0*sx)-3, int(y0*sy)-3, 6, 6)
            painter.drawEllipse(int(x1*sx)-3, int(y1*sy)-3, 6, 6)
            painter.end()
            self.profile_thumbnail.setPixmap(scaled)

class HistoryPanel(QWidget):
    """Operation history panel with colored dots and click-to-restore."""
    item_clicked = Signal(int)  # index to restore

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(220)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header
        header = QWidget()
        header.setFixedHeight(32)
        header.setStyleSheet('border-top: 1px solid #3A3A3A;')
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(12, 0, 12, 0)

        title = QLabel('HISTORIQUE DES OPÉRATIONS')
        title.setStyleSheet('color: #ABABAB; font-size: 10px; font-weight: bold; letter-spacing: 1px; border: none;')
        header_layout.addWidget(title)
        header_layout.addStretch()

        self.btn_clear = QPushButton()
        self.btn_clear.setIcon(IconProvider.get_icon('trash', '#606060', 14))
        self.btn_clear.setFixedSize(22, 22)
        self.btn_clear.setToolTip('Effacer tout l\'historique')
        self.btn_clear.setStyleSheet('QPushButton { background: transparent; border: none; }'
                                      'QPushButton:hover { background: #2D2D2D; }')
        self.btn_clear.clicked.connect(self._confirm_clear)
        header_layout.addWidget(self.btn_clear)
        layout.addWidget(header)

        # Scroll area for items
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setStyleSheet('QScrollArea { background: transparent; border: none; }')

        self._items_widget = QWidget()
        self._items_layout = QVBoxLayout(self._items_widget)
        self._items_layout.setContentsMargins(4, 4, 4, 4)
        self._items_layout.setSpacing(1)
        self._items_layout.addStretch()

        scroll.setWidget(self._items_widget)
        layout.addWidget(scroll)

        self._items = []  # list of (widget, name)
        self._active_index = -1

    def add_entry(self, name, is_load=False):
        idx = len(self._items)
        item = QPushButton()
        item.setFixedHeight(32)
        item.setCursor(Qt.PointingHandCursor)

        # Determine dot color
        if is_load:
            dot_color = '#4CA3FF'
        else:
            dot_color = '#2D9F5D'

        item.setText(f'  {idx + 1}   {name}')
        item.setStyleSheet(self._item_style(False, dot_color))
        item.clicked.connect(lambda checked, i=idx: self._on_click(i))
        item.setToolTip(name)

        # Insert before the stretch
        self._items_layout.insertWidget(self._items_layout.count() - 1, item)
        self._items.append((item, name, dot_color))
        self._set_active(idx)

    def _set_active(self, idx):
        self._active_index = idx
        for i, (item, name, dot_color) in enumerate(self._items):
            is_active = (i == idx)
            if is_active:
                color = '#38B86E'
            else:
                color = dot_color
            item.setStyleSheet(self._item_style(is_active, color))

    def _item_style(self, active, dot_color):
        if active:
            return (f'QPushButton {{ background: #2A3A52; color: #E8E8E8; border: none; '
                    f'border-left: 2px solid #38B86E; text-align: left; '
                    f'padding: 0 8px; font-size: 12px; }}')
        return (f'QPushButton {{ background: transparent; color: #ABABAB; border: none; '
                f'text-align: left; padding: 0 8px 0 10px; font-size: 12px; }}'
                f'QPushButton:hover {{ background: #2D2D2D; }}')

    def _on_click(self, idx):
        self._set_active(idx)
        self.item_clicked.emit(idx)

    def _confirm_clear(self):
        reply = QMessageBox.question(
            self, 'Confirmer', 'Effacer tout l\'historique ?',
            QMessageBox.Yes | QMessageBox.No, QMessageBox.No)
        if reply == QMessageBox.Yes:
            self.clear()

    def clear(self):
        for item, _, _ in self._items:
            item.deleteLater()
        self._items.clear()
        self._active_index = -1

# === PART 2: Main Window + Stylesheet ===


class CustomIPT(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('Custom-IPT — Image Processing Toolbox')
        self.setMinimumSize(1100, 700)
        self.resize(1400, 850)

        # Image state
        self.original_image = None
        self.result_image = None
        self.preview_base = None
        self.filename = ''
        self._save_path = ''

        # History
        self.history = HistoryStack(max_size=20)

        # Interaction mode
        self.interaction_mode = None  # 'pan', 'select', 'line_profile', 'distance', 'pipette'
        self.click_points = []

        # Current tool
        self.current_tool_name = ''
        self._selected_tool_btn = None

        # Real-time preview
        self.live_preview = True
        self._preview_timer = QTimer()
        self._preview_timer.setSingleShot(True)
        self._preview_timer.setInterval(150)
        self._preview_timer.timeout.connect(self._do_preview)
        self._preview_func = None
        self._preview_kwargs_func = None

        # Processing state
        self.last_proc_time = 0
        self._processing = False
        self._worker = None
        self._thread = None

        # Zoom sync
        self._syncing_zoom = False

        self._build_ui()
        self._build_menus()
        self._build_sidebar()
        self._build_statusbar()
        self._setup_shortcuts()

    # ══════════════════════════════════════════════════════════════════════
    #  BUILD UI
    # ══════════════════════════════════════════════════════════════════════

    def _build_ui(self):
        central = QWidget()
        central.setObjectName('centralWidget')
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Main horizontal splitter
        self.main_splitter = QSplitter(Qt.Horizontal)
        self.main_splitter.setChildrenCollapsible(False)
        self.main_splitter.setHandleWidth(1)

        # ── LEFT PANEL ──
        self.left_panel = QWidget()
        self.left_panel.setFixedWidth(245)
        self.left_panel.setStyleSheet('background: #252525;')
        left_layout = QVBoxLayout(self.left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(0)

        # Left panel header
        left_header = QWidget()
        left_header.setFixedHeight(36)
        left_header.setStyleSheet('background: #252525; border-bottom: 1px solid #3A3A3A;')
        lh_layout = QHBoxLayout(left_header)
        lh_layout.setContentsMargins(12, 0, 12, 0)
        lh_title = QLabel('OUTILS')
        lh_title.setStyleSheet('color: #ABABAB; font-size: 11px; font-weight: 600; letter-spacing: 1.2px;')
        lh_layout.addWidget(lh_title)
        lh_layout.addStretch()
        btn_close_left = QPushButton()
        btn_close_left.setIcon(IconProvider.get_icon('x', '#606060', 14))
        btn_close_left.setFixedSize(20, 20)
        btn_close_left.setStyleSheet('QPushButton { background: transparent; border: none; } QPushButton:hover { background: #333333; }')
        btn_close_left.setToolTip('Fermer le panneau Outils')
        lh_layout.addWidget(btn_close_left)
        left_layout.addWidget(left_header)

        # Scrollable tool list
        self.tool_scroll = QScrollArea()
        self.tool_scroll.setWidgetResizable(True)
        self.tool_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.tool_scroll.setStyleSheet('QScrollArea { background: #252525; border: none; }')
        self.tool_container = QWidget()
        self.tool_container.setStyleSheet('background: #252525;')
        self.tool_layout = QVBoxLayout(self.tool_container)
        self.tool_layout.setContentsMargins(0, 0, 0, 0)
        self.tool_layout.setSpacing(0)
        self.tool_scroll.setWidget(self.tool_container)
        left_layout.addWidget(self.tool_scroll)

        self.main_splitter.addWidget(self.left_panel)

        # ── CENTER ──
        center_widget = QWidget()
        center_layout = QVBoxLayout(center_widget)
        center_layout.setContentsMargins(0, 0, 0, 0)
        center_layout.setSpacing(0)

        # Progress bar (thin, hidden by default)
        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedHeight(3)
        self.progress_bar.setTextVisible(False)
        self.progress_bar.setStyleSheet(
            'QProgressBar { background: #1C1C1C; border: none; }'
            'QProgressBar::chunk { background: #1473E6; }')
        self.progress_bar.hide()
        center_layout.addWidget(self.progress_bar)

        # Canvas header (tabs + image info)
        self.canvas_header = QWidget()
        self.canvas_header.setFixedHeight(36)
        self.canvas_header.setStyleSheet('background: #252525; border-bottom: 1px solid #3A3A3A;')
        ch_layout = QHBoxLayout(self.canvas_header)
        ch_layout.setContentsMargins(0, 0, 16, 0)
        ch_layout.setSpacing(0)

        self.tab_original = QPushButton('Original')
        self.tab_original.setCheckable(True)
        self.tab_original.setChecked(True)
        self.tab_original.setFixedHeight(36)
        self.tab_original.clicked.connect(lambda: self._switch_view_tab(0))

        self.tab_result = QPushButton('Résultat')
        self.tab_result.setCheckable(True)
        self.tab_result.setChecked(True)
        self.tab_result.setFixedHeight(36)
        self.tab_result.clicked.connect(lambda: self._switch_view_tab(1))

        self._update_view_tabs()
        ch_layout.addWidget(self.tab_original)
        ch_layout.addWidget(self.tab_result)
        ch_layout.addStretch()

        # Image metadata (right side of header)
        self.img_dims_label = QLabel('')
        self.img_dims_label.setStyleSheet('color: #ABABAB; font-size: 11px; padding: 0 16px;')
        self.img_mode_label = QLabel('')
        self.img_mode_label.setStyleSheet('color: #ABABAB; font-size: 11px; padding: 0 16px; border-left: 1px solid #3A3A3A;')
        ch_layout.addWidget(self.img_dims_label)
        ch_layout.addWidget(self.img_mode_label)
        center_layout.addWidget(self.canvas_header)

        # Image views (side by side)
        self.view_splitter = QSplitter(Qt.Horizontal)
        self.view_splitter.setHandleWidth(1)
        self.view_splitter.setStyleSheet('QSplitter::handle { background: #3A3A3A; }')
        self.view_original = ZoomableImageView()
        self.view_result = ZoomableImageView()
        self.view_result.coord_changed.connect(self._on_coord_changed)
        self.view_original.coord_changed.connect(self._on_coord_changed)
        self.view_result.point_clicked.connect(self._on_canvas_click)
        self.view_original.zoom_changed.connect(lambda z: self._sync_zoom(z, 'original'))
        self.view_result.zoom_changed.connect(lambda z: self._sync_zoom(z, 'result'))
        self.view_splitter.addWidget(self.view_original)
        self.view_splitter.addWidget(self.view_result)
        center_layout.addWidget(self.view_splitter, stretch=1)

        # Canvas toolbar (below images)
        self.canvas_toolbar = QWidget()
        self.canvas_toolbar.setFixedHeight(40)
        self.canvas_toolbar.setStyleSheet('background: #2D2D2D; border-top: 1px solid #3A3A3A; border-bottom: 1px solid #3A3A3A;')
        ct_layout = QHBoxLayout(self.canvas_toolbar)
        ct_layout.setContentsMargins(12, 0, 12, 0)
        ct_layout.setSpacing(4)

        # Canvas tool buttons
        self._canvas_tools = []
        canvas_tools_data = [
            ('hand-move', 'Outil Main - Déplacer l\'image', 'pan'),
            ('rectangle-dashed', 'Outil Sélection - Sélectionner une zone', 'select'),
            ('pencil', 'Outil Dessin - Tracer une ligne de profil', 'line_profile'),
            ('eyedropper', 'Outil Pipette - Mesurer l\'intensité', 'pipette'),
        ]
        for icon_name, tooltip, mode in canvas_tools_data:
            btn = QPushButton()
            btn.setIcon(IconProvider.get_icon(icon_name, '#ABABAB', 16))
            btn.setFixedSize(28, 28)
            btn.setCheckable(True)
            btn.setToolTip(tooltip)
            btn.setStyleSheet(
                'QPushButton { background: transparent; border: 1px solid transparent; }'
                'QPushButton:hover { background: #383838; }'
                'QPushButton:checked { background: #2A3A52; border: 1px solid #1473E6; }')
            btn.clicked.connect(lambda checked, m=mode: self._set_canvas_mode(m))
            ct_layout.addWidget(btn)
            self._canvas_tools.append((btn, mode))
        self._canvas_tools[0][0].setChecked(True)  # Pan default

        # Separator
        sep = QFrame()
        sep.setFrameShape(QFrame.VLine)
        sep.setFixedHeight(20)
        sep.setStyleSheet('color: #3A3A3A;')
        ct_layout.addWidget(sep)

        # Coordinate display
        self.coord_label = QLabel('X: —  Y: —  |  Intensité: —')
        self.coord_label.setStyleSheet(
            'color: #ABABAB; font-size: 12px; font-family: "Cascadia Code", "Consolas", monospace;')
        ct_layout.addWidget(self.coord_label)
        ct_layout.addStretch()
        center_layout.addWidget(self.canvas_toolbar)

        # Analysis panel (bottom)
        self.analysis_panel = AnalysisPanel()
        center_layout.addWidget(self.analysis_panel)

        self.main_splitter.addWidget(center_widget)

        # ── RIGHT PANEL ──
        self.right_panel = QWidget()
        self.right_panel.setFixedWidth(265)
        self.right_panel.setStyleSheet('background: #252525;')
        right_layout = QVBoxLayout(self.right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(0)

        # Params header
        params_header = QWidget()
        params_header.setFixedHeight(36)
        params_header.setStyleSheet('background: #252525; border-bottom: 1px solid #3A3A3A;')
        ph_layout = QHBoxLayout(params_header)
        ph_layout.setContentsMargins(12, 0, 12, 0)
        ph_title = QLabel('PARAMÈTRES')
        ph_title.setStyleSheet('color: #ABABAB; font-size: 11px; font-weight: 600; letter-spacing: 1.2px;')
        ph_layout.addWidget(ph_title)
        ph_layout.addStretch()
        btn_close_right = QPushButton()
        btn_close_right.setIcon(IconProvider.get_icon('x', '#606060', 14))
        btn_close_right.setFixedSize(20, 20)
        btn_close_right.setStyleSheet('QPushButton { background: transparent; border: none; } QPushButton:hover { background: #333333; }')
        btn_close_right.setToolTip('Fermer le panneau Paramètres')
        ph_layout.addWidget(btn_close_right)
        right_layout.addWidget(params_header)

        # Params scroll area
        params_scroll = QScrollArea()
        params_scroll.setWidgetResizable(True)
        params_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        params_scroll.setStyleSheet('QScrollArea { background: #252525; border: none; }')
        self.param_container = QWidget()
        self.param_container.setStyleSheet('background: #252525;')
        self.param_container_layout = QVBoxLayout(self.param_container)
        self.param_container_layout.setContentsMargins(14, 12, 14, 12)
        self.param_container_layout.setSpacing(8)
        # Add initial message
        self._no_tool_label = QLabel('Sélectionnez un outil\npour voir ses paramètres')
        self._no_tool_label.setStyleSheet('color: #606060; font-size: 12px;')
        self._no_tool_label.setAlignment(Qt.AlignCenter)
        self.param_container_layout.addWidget(self._no_tool_label)
        self.param_container_layout.addStretch()
        params_scroll.setWidget(self.param_container)
        right_layout.addWidget(params_scroll, stretch=1)

        # History panel (bottom of right)
        self.history_panel = HistoryPanel()
        self.history_panel.item_clicked.connect(self._undo_to_index)
        right_layout.addWidget(self.history_panel)

        self.main_splitter.addWidget(self.right_panel)
        self.main_splitter.setSizes([245, 800, 265])

        main_layout.addWidget(self.main_splitter)

    # ══════════════════════════════════════════════════════════════════════
    #  MENUS
    # ══════════════════════════════════════════════════════════════════════

    def _build_menus(self):
        mb = self.menuBar()
        mb.setFixedHeight(30)

        m_file = mb.addMenu('Fichier')
        self._add_action(m_file, 'Ouvrir', 'Ctrl+O', self.open_image)
        self._add_action(m_file, 'Enregistrer', 'Ctrl+S', self.save_image)
        self._add_action(m_file, 'Enregistrer sous', 'Ctrl+Shift+S', self.save_image_as)
        m_file.addSeparator()
        self._add_action(m_file, 'Reset', 'Ctrl+R', self.reset_image)
        m_file.addSeparator()
        self._add_action(m_file, 'Quitter', 'Ctrl+Q', self.close)

        m_edit = mb.addMenu('Edition')
        self._add_action(m_edit, 'Annuler', 'Ctrl+Z', self.undo)
        self._add_action(m_edit, 'Rétablir', 'Ctrl+Y', self.redo)
        m_edit.addSeparator()
        self._add_action(m_edit, 'Copier résultat', '', self._copy_result)

        m_view = mb.addMenu('Affichage')
        self._add_action(m_view, 'Zoom avant', 'Ctrl+=', self._zoom_in)
        self._add_action(m_view, 'Zoom arrière', 'Ctrl+-', self._zoom_out)
        self._add_action(m_view, 'Ajuster à la fenêtre', 'Ctrl+0', self._fit_view)
        self._add_action(m_view, 'Taille réelle', 'Ctrl+1', self._actual_size)
        m_view.addSeparator()
        self._add_action(m_view, 'Afficher histogramme', '', lambda: self.analysis_panel.setCurrentIndex(0))
        self._add_action(m_view, 'Afficher profil de ligne', '', lambda: self.analysis_panel.setCurrentIndex(1))

        m_tools = mb.addMenu('Outils')
        self._add_action(m_tools, 'Luminosité / Contraste', '', self._tool_contrast)
        self._add_action(m_tools, 'Égalisation d\'histogramme', '', self._tool_histeq)
        self._add_action(m_tools, 'Seuillage (Otsu)', '', self._tool_otsu)
        m_tools.addSeparator()
        self._add_action(m_tools, 'Moyenneur', '', self._tool_box)
        self._add_action(m_tools, 'Médian', '', self._tool_median)
        self._add_action(m_tools, 'Gaussien', '', self._tool_gaussian)
        self._add_action(m_tools, 'Sobel', '', self._tool_sobel)
        self._add_action(m_tools, 'Prewitt', '', self._tool_prewitt)
        self._add_action(m_tools, 'Laplacien', '', self._tool_laplacian)
        self._add_action(m_tools, 'Netteté (Unsharp Mask)', '', self._tool_unsharp)

        m_analysis = mb.addMenu('Analyse')
        self._add_action(m_analysis, 'Histogramme', '', lambda: self.analysis_panel.setCurrentIndex(0))
        self._add_action(m_analysis, 'Profil de ligne', '', self.activate_line_profile)
        self._add_action(m_analysis, 'Mesure de distance', '', self.activate_distance)

        m_help = mb.addMenu('Aide')
        self._add_action(m_help, 'À propos', '', self._show_about)
        self._add_action(m_help, 'Documentation', '', lambda: None)

    def _add_action(self, menu, name, shortcut, callback):
        act = QAction(name, self)
        if shortcut:
            act.setShortcut(QKeySequence(shortcut))
        act.triggered.connect(callback)
        menu.addAction(act)

    # ══════════════════════════════════════════════════════════════════════
    #  LEFT SIDEBAR
    # ══════════════════════════════════════════════════════════════════════

    def _build_sidebar(self):
        self._sidebar_tool_btns = []

        self._add_category('Transformations Ponctuelles')
        self._add_tool('sun', 'Luminosité / Contraste', self._tool_contrast)
        self._add_tool('chart-bar', 'Égalisation d\'histogramme', self._tool_histeq)
        self._add_tool('adjustments', 'Seuillage (Otsu)', self._tool_otsu)

        self._add_category('Filtres (Convolution)')
        self._add_tool('grid-dots', 'Moyenneur', self._tool_box)
        self._add_tool('layout-grid', 'Médian', self._tool_median)
        self._add_tool('circle-dot', 'Gaussien', self._tool_gaussian)
        self._add_tool('arrows-horizontal', 'Sobel', self._tool_sobel)
        self._add_tool('arrows-diagonal', 'Prewitt', self._tool_prewitt)
        self._add_tool('diamond', 'Laplacien', self._tool_laplacian)
        self._add_tool('sparkles', 'Netteté (Unsharp Mask)', self._tool_unsharp)

        self._add_category('Morphologie')
        self._add_tool('minus-circle', 'Érosion', self._tool_erode)
        self._add_tool('plus-circle', 'Dilatation', self._tool_dilate)
        self._add_tool('circle-off', 'Ouverture', self._tool_opening)
        self._add_tool('circle', 'Fermeture', self._tool_closing)
        self._add_tool('bone', 'Squelette (Zhang-Suen)', self._tool_skeleton)

        self._add_category('Analyse')
        self._add_tool('chart-histogram', 'Histogramme', lambda: self.analysis_panel.setCurrentIndex(0))
        self._add_tool('trending-up', 'Profil de ligne', self.activate_line_profile)
        self._add_tool('ruler', 'Mesure de distance', self.activate_distance)

        self.tool_layout.addStretch()

    def _add_category(self, name):
        header = QWidget()
        header.setFixedHeight(32)
        header.setStyleSheet('background: transparent; border-left: 3px solid #1473E6;')
        h_layout = QHBoxLayout(header)
        h_layout.setContentsMargins(16, 0, 12, 0)
        lbl = QLabel(name)
        lbl.setStyleSheet('color: #FFFFFF; font-size: 12px; font-weight: bold;')
        h_layout.addWidget(lbl)
        self.tool_layout.addWidget(header)

    def _add_tool(self, icon_name, name, callback):
        btn = QPushButton()
        btn.setFixedHeight(32)
        btn.setIcon(IconProvider.get_icon(icon_name, '#ABABAB', 16))
        btn.setText(f'  {name}')
        btn.setToolTip(name)
        btn.setCursor(Qt.PointingHandCursor)
        btn.setStyleSheet(
            'QPushButton { background: transparent; color: #ABABAB; border: none; '
            'text-align: left; padding: 0 12px 0 32px; font-size: 12px; }'
            'QPushButton:hover { background: #2E2E2E; color: #E8E8E8; }')

        def on_click():
            self._select_tool(btn)
            callback()

        btn.clicked.connect(on_click)
        self.tool_layout.addWidget(btn)
        self._sidebar_tool_btns.append(btn)

    def _select_tool(self, btn):
        # Deselect previous
        if self._selected_tool_btn:
            self._selected_tool_btn.setStyleSheet(
                'QPushButton { background: transparent; color: #ABABAB; border: none; '
                'text-align: left; padding: 0 12px 0 32px; font-size: 12px; }'
                'QPushButton:hover { background: #2E2E2E; color: #E8E8E8; }')
        # Select new
        self._selected_tool_btn = btn
        btn.setStyleSheet(
            'QPushButton { background: #2A3A52; color: #E8E8E8; '
            'border: none; border-left: 3px solid #1473E6; '
            'text-align: left; padding: 0 12px 0 29px; font-size: 12px; }')

    # ══════════════════════════════════════════════════════════════════════
    #  STATUS BAR
    # ══════════════════════════════════════════════════════════════════════

    def _build_statusbar(self):
        sb = QStatusBar()
        sb.setFixedHeight(28)
        self.setStatusBar(sb)

        self.status_state = QLabel('Prêt')
        self.status_state.setStyleSheet('color: #ABABAB; font-size: 11px; padding: 0 12px;')
        self.status_state.setMaximumWidth(300)

        sep1 = QFrame()
        sep1.setFrameShape(QFrame.VLine)
        sep1.setStyleSheet('color: #3A3A3A;')

        self.status_file = QLabel('Aucune image')
        self.status_file.setStyleSheet('color: #777777; font-size: 11px; padding: 0 12px;')

        sep2 = QFrame()
        sep2.setFrameShape(QFrame.VLine)
        sep2.setStyleSheet('color: #3A3A3A;')

        self.status_info = QLabel('')
        self.status_info.setStyleSheet('color: #777777; font-size: 11px; padding: 0 12px;')

        sb.addWidget(self.status_state)
        sb.addWidget(sep1)
        sb.addWidget(self.status_file)
        sb.addPermanentWidget(sep2)
        sb.addPermanentWidget(self.status_info)

    def _update_status(self, message=''):
        if message:
            self.status_state.setText(message)
        if self.original_image is not None:
            h, w = self.original_image.shape[:2]
            mode = 'Niveaux de gris (8 bits)' if self.original_image.ndim == 2 else 'Couleur RGB (8 bits)'
            self.status_file.setText(f'Image : {self.filename}')
            self.status_info.setText(f'Taille : {w} × {h}  |  {mode}')
        else:
            self.status_file.setText('Aucune image')
            self.status_info.setText('')

    # ══════════════════════════════════════════════════════════════════════
    #  KEYBOARD SHORTCUTS
    # ══════════════════════════════════════════════════════════════════════

    def _setup_shortcuts(self):
        from PySide6.QtGui import QShortcut
        QShortcut(QKeySequence('H'), self).activated.connect(lambda: self._set_canvas_mode('pan'))
        QShortcut(QKeySequence('L'), self).activated.connect(self.activate_line_profile)
        QShortcut(QKeySequence('D'), self).activated.connect(self.activate_distance)
        QShortcut(QKeySequence('Escape'), self).activated.connect(lambda: self._set_canvas_mode('pan'))

    # ══════════════════════════════════════════════════════════════════════
    #  VIEW TABS (Original / Résultat)
    # ══════════════════════════════════════════════════════════════════════

    def _update_view_tabs(self, active=None):
        active_style = ('QPushButton { background: transparent; color: #E8E8E8; font-size: 12px; '
                         'font-weight: 600; border: none; border-bottom: 2px solid #1473E6; padding: 0 16px; }')
        inactive_style = ('QPushButton { background: transparent; color: #ABABAB; font-size: 12px; '
                           'border: none; border-bottom: 2px solid transparent; padding: 0 16px; }'
                           'QPushButton:hover { color: #E8E8E8; }')
        self.tab_original.setStyleSheet(active_style if self.tab_original.isChecked() else inactive_style)
        self.tab_result.setStyleSheet(active_style if self.tab_result.isChecked() else inactive_style)

    def _switch_view_tab(self, idx):
        if idx == 0:
            self.tab_original.setChecked(True)
            self.tab_result.setChecked(False)
            self.view_original.show()
            self.view_result.hide()
        elif idx == 1:
            self.tab_original.setChecked(False)
            self.tab_result.setChecked(True)
            self.view_original.hide()
            self.view_result.show()
        else:
            self.tab_original.setChecked(True)
            self.tab_result.setChecked(True)
            self.view_original.show()
            self.view_result.show()
        self._update_view_tabs()

    # ══════════════════════════════════════════════════════════════════════
    #  PARAMETER PANEL HELPERS
    # ══════════════════════════════════════════════════════════════════════

    def _clear_params(self):
        while self.param_container_layout.count():
            child = self.param_container_layout.takeAt(0)
            w = child.widget()
            if w:
                w.deleteLater()
            elif child.layout():
                while child.layout().count():
                    sub = child.layout().takeAt(0)
                    if sub.widget():
                        sub.widget().deleteLater()

    def _add_title(self, text):
        lbl = QLabel(text)
        lbl.setStyleSheet('color: #FFFFFF; font-size: 14px; font-weight: bold; padding: 0 0 8px 0;')
        self.param_container_layout.addWidget(lbl)

    def _add_info_text(self, text, italic=False):
        lbl = QLabel(text)
        style = 'color: #606060; font-size: 12px;'
        if italic:
            style += ' font-style: italic;'
        lbl.setStyleSheet(style)
        lbl.setAlignment(Qt.AlignCenter)
        lbl.setWordWrap(True)
        self.param_container_layout.addWidget(lbl)

    def _add_slider(self, label, min_v, max_v, default, step=1, decimals=0):
        container = QWidget()
        container.setStyleSheet('background: transparent;')
        lay = QVBoxLayout(container)
        lay.setContentsMargins(0, 4, 0, 4)
        lay.setSpacing(2)

        # Label + value row
        row = QHBoxLayout()
        name_lbl = QLabel(label)
        name_lbl.setStyleSheet('color: #ABABAB; font-size: 12px;')
        val_lbl = QLabel()
        val_lbl.setStyleSheet('color: #E8E8E8; font-size: 12px; font-weight: bold;')
        val_lbl.setAlignment(Qt.AlignRight)
        row.addWidget(name_lbl)
        row.addWidget(val_lbl)
        lay.addLayout(row)

        # Slider
        slider = QSlider(Qt.Horizontal)
        slider.setMinimum(int(min_v / step))
        slider.setMaximum(int(max_v / step))
        slider.setValue(int(default / step))
        slider._step = step
        slider._decimals = decimals

        # Min/max row
        range_row = QHBoxLayout()
        min_lbl = QLabel(f'{min_v}')
        min_lbl.setStyleSheet('color: #606060; font-size: 10px;')
        max_lbl = QLabel(f'{max_v}')
        max_lbl.setStyleSheet('color: #606060; font-size: 10px;')
        max_lbl.setAlignment(Qt.AlignRight)
        range_row.addWidget(min_lbl)
        range_row.addWidget(max_lbl)

        def _update(v):
            actual = v * step
            val_lbl.setText(f'{actual:.{decimals}f}' if decimals else f'{int(actual)}')
            if self.live_preview:
                self._preview_timer.start()

        slider.valueChanged.connect(_update)
        _update(slider.value())

        lay.addWidget(slider)
        lay.addLayout(range_row)
        self.param_container_layout.addWidget(container)
        return slider

    def _add_combo(self, label, options, default_idx=0):
        container = QWidget()
        container.setStyleSheet('background: transparent;')
        lay = QVBoxLayout(container)
        lay.setContentsMargins(0, 4, 0, 4)
        lay.setSpacing(4)
        lbl = QLabel(label)
        lbl.setStyleSheet('color: #ABABAB; font-size: 12px;')
        combo = QComboBox()
        combo.addItems(options)
        combo.setCurrentIndex(default_idx)
        combo.setFixedHeight(28)
        combo.currentIndexChanged.connect(lambda: self._preview_timer.start() if self.live_preview else None)
        lay.addWidget(lbl)
        lay.addWidget(combo)
        self.param_container_layout.addWidget(container)
        return combo

    def _add_preview_checkbox(self):
        cb = QCheckBox('  Aperçu en temps réel')
        cb.setChecked(self.live_preview)
        cb.toggled.connect(self._on_preview_toggled)
        self.param_container_layout.addWidget(cb)
        return cb

    def _add_buttons(self, apply_callback):
        container = QWidget()
        container.setStyleSheet('background: transparent;')
        lay = QVBoxLayout(container)
        lay.setContentsMargins(0, 14, 0, 4)
        lay.setSpacing(6)

        self._btn_apply = QPushButton()
        self._btn_apply.setObjectName('btnAppliquer')
        self._btn_apply.setIcon(IconProvider.get_icon('check', '#FFFFFF', 16))
        self._btn_apply.setText('  Appliquer' if not self.live_preview else '  Confirmer')
        self._btn_apply.setFixedHeight(34)
        self._btn_apply.setCursor(Qt.PointingHandCursor)
        self._btn_apply.clicked.connect(apply_callback)
        lay.addWidget(self._btn_apply)

        btn_reset = QPushButton('  Réinitialiser')
        btn_reset.setObjectName('btnReinitialiser')
        btn_reset.setFixedHeight(32)
        btn_reset.setCursor(Qt.PointingHandCursor)
        btn_reset.clicked.connect(self._reset_preview)
        lay.addWidget(btn_reset)

        self.param_container_layout.addWidget(container)

    # ══════════════════════════════════════════════════════════════════════
    #  PREVIEW LOGIC
    # ══════════════════════════════════════════════════════════════════════

    def _on_preview_toggled(self, checked):
        self.live_preview = checked
        if hasattr(self, '_btn_apply'):
            self._btn_apply.setText('  Confirmer' if checked else '  Appliquer')
        if checked and self._preview_func:
            self._preview_timer.start()

    def _do_preview(self):
        if self._preview_func and self.preview_base is not None:
            try:
                kwargs = self._preview_kwargs_func() if self._preview_kwargs_func else {}
                # For large images, scale down for preview
                preview_img = self.preview_base
                h, w = preview_img.shape[:2]
                scale_factor = 1.0
                if h * w > 1_000_000:  # > 1MP
                    scale_factor = 512.0 / max(h, w)
                    new_h, new_w = int(h * scale_factor), int(w * scale_factor)
                    if preview_img.ndim == 2:
                        from PIL import Image as PILImage
                        pil = PILImage.fromarray(preview_img)
                        pil = pil.resize((new_w, new_h), PILImage.LANCZOS)
                        preview_img = np.array(pil)
                    else:
                        from PIL import Image as PILImage
                        pil = PILImage.fromarray(preview_img)
                        pil = pil.resize((new_w, new_h), PILImage.LANCZOS)
                        preview_img = np.array(pil)

                t0 = time.perf_counter()
                result = self._preview_func(preview_img, **kwargs)
                self.last_proc_time = (time.perf_counter() - t0) * 1000

                if isinstance(result, tuple):
                    preview_result = result[0]
                else:
                    preview_result = result

                # If we scaled down, apply to full image for display
                if scale_factor < 1.0:
                    # For preview, just show the scaled result stretched
                    self.result_image = preview_result
                else:
                    self.result_image = preview_result

                self._refresh_result_display()
            except Exception:
                pass

    def _reset_preview(self):
        if self.preview_base is not None:
            self.result_image = self.preview_base.copy()
            self._refresh_result_display()

    def _prepare_preview(self, func, kwargs_func):
        self.preview_base = self.result_image.copy() if self.result_image is not None else None
        self._preview_func = func
        self._preview_kwargs_func = kwargs_func

    # ══════════════════════════════════════════════════════════════════════
    #  IMAGE I/O
    # ══════════════════════════════════════════════════════════════════════

    def _check_loaded(self):
        if self.original_image is None:
            QMessageBox.warning(self, 'Attention', 'Veuillez d\'abord ouvrir une image.')
            return False
        return True

    def open_image(self):
        path, _ = QFileDialog.getOpenFileName(
            self, 'Ouvrir une image', '',
            'Images (*.png *.jpg *.jpeg *.bmp *.tiff *.tif);;Tous (*)')
        if not path:
            return
        try:
            pil_img = Image.open(path)
            if pil_img.mode == 'RGBA':
                pil_img = pil_img.convert('RGB')
            elif pil_img.mode not in ('RGB', 'L'):
                pil_img = pil_img.convert('RGB')
            self.original_image = np.array(pil_img, dtype=np.uint8)
            self.result_image = self.original_image.copy()
            self.filename = path.replace('\\', '/').split('/')[-1]

            self.history.clear()
            self.history.push('Image chargée', self.original_image)
            self.history_panel.clear()
            self.history_panel.add_entry('Image chargée', is_load=True)

            self._refresh_all()
            self._fit_view()
            self._update_status('Image chargée')
            self._update_image_info()
        except Exception as e:
            QMessageBox.critical(self, 'Erreur', f'Impossible d\'ouvrir:\n{e}')

    def save_image(self):
        if not self._check_loaded():
            return
        if self._save_path:
            self._do_save(self._save_path)
        else:
            self.save_image_as()

    def save_image_as(self):
        if not self._check_loaded():
            return
        path, _ = QFileDialog.getSaveFileName(
            self, 'Enregistrer sous', '',
            'PNG (*.png);;JPEG (*.jpg);;BMP (*.bmp);;TIFF (*.tiff)')
        if path:
            self._do_save(path)

    def _do_save(self, path):
        try:
            mode = 'L' if self.result_image.ndim == 2 else 'RGB'
            Image.fromarray(self.result_image, mode=mode).save(path)
            self._save_path = path
            self._update_status(f'Sauvegardé : {path.split("/")[-1]}')
        except Exception as e:
            QMessageBox.critical(self, 'Erreur', f'Impossible de sauvegarder:\n{e}')

    def reset_image(self):
        if self.original_image is None:
            return
        self.result_image = self.original_image.copy()
        self.history.push('Reset', self.result_image)
        self.history_panel.add_entry('Reset')
        self._refresh_all()
        self._update_status('Reset')

    def _copy_result(self):
        if self.result_image is None:
            return
        pm = ndarray_to_qpixmap(self.result_image)
        QApplication.clipboard().setPixmap(pm)
        self._update_status('Résultat copié dans le presse-papiers')

    # ══════════════════════════════════════════════════════════════════════
    #  UNDO / REDO
    # ══════════════════════════════════════════════════════════════════════

    def undo(self):
        result = self.history.undo()
        if result:
            _, img = result
            self.result_image = img
            self._refresh_all()
            self._update_status('Annuler')

    def redo(self):
        result = self.history.redo()
        if result:
            _, img = result
            self.result_image = img
            self._refresh_all()
            self._update_status('Rétablir')

    def _undo_to_index(self, idx):
        result = self.history.get_at(idx)
        if result:
            _, img = result
            self.result_image = img
            self._refresh_all()

    # ══════════════════════════════════════════════════════════════════════
    #  DISPLAY REFRESH
    # ══════════════════════════════════════════════════════════════════════

    def _refresh_all(self):
        self._refresh_original_display()
        self._refresh_result_display()

    def _refresh_original_display(self):
        if self.original_image is not None:
            self.view_original.set_image(self.original_image)

    def _refresh_result_display(self):
        if self.result_image is not None:
            self.view_result.set_image(self.result_image)
            self.analysis_panel.histogram.update_histogram(self.result_image)
            self.analysis_panel.update_stats(self.result_image)
            self.analysis_panel.update_preview(self.result_image)
            self._update_image_info()
            self._update_status()

    def _update_image_info(self):
        if self.result_image is not None:
            h, w = self.result_image.shape[:2]
            mode = 'Niveaux de gris (8 bits)' if self.result_image.ndim == 2 else 'Couleur RGB (8 bits)'
            self.img_dims_label.setText(f'{w} × {h}')
            self.img_mode_label.setText(mode)

    def _on_coord_changed(self, x, y):
        if self.result_image is None:
            return
        img = self.result_image
        h, w = img.shape[:2]
        if 0 <= x < w and 0 <= y < h:
            if img.ndim == 2:
                val = int(img[y, x])
                self.coord_label.setText(f'X: {x}  Y: {y}  |  Intensité: {val}')
            else:
                r, g, b = int(img[y, x, 0]), int(img[y, x, 1]), int(img[y, x, 2])
                self.coord_label.setText(f'X: {x}  Y: {y}  |  R: {r}  G: {g}  B: {b}')

    # ══════════════════════════════════════════════════════════════════════
    #  ZOOM CONTROLS
    # ══════════════════════════════════════════════════════════════════════

    def _sync_zoom(self, zoom, source):
        if self._syncing_zoom:
            return
        self._syncing_zoom = True
        try:
            if source == 'original':
                self.view_result.set_zoom(zoom)
            else:
                self.view_original.set_zoom(zoom)
        finally:
            self._syncing_zoom = False

    def _zoom_in(self):
        z = self.view_result._zoom * 1.25
        self.view_result.set_zoom(z)
        self.view_original.set_zoom(z)

    def _zoom_out(self):
        z = self.view_result._zoom / 1.25
        self.view_result.set_zoom(z)
        self.view_original.set_zoom(z)

    def _fit_view(self):
        self.view_original.fit_to_view()
        self.view_result.fit_to_view()

    def _actual_size(self):
        self.view_original.actual_size()
        self.view_result.actual_size()

    # ══════════════════════════════════════════════════════════════════════
    #  CANVAS INTERACTION MODES
    # ══════════════════════════════════════════════════════════════════════

    def _set_canvas_mode(self, mode):
        self.interaction_mode = mode
        self.click_points = []

        for btn, btn_mode in self._canvas_tools:
            btn.setChecked(btn_mode == mode)

        if mode == 'pan':
            self.view_result._click_mode = False
            self.view_original._click_mode = False
            self.view_result.setDragMode(QGraphicsView.ScrollHandDrag)
            self.view_original.setDragMode(QGraphicsView.ScrollHandDrag)
            self.view_result.setCursor(Qt.OpenHandCursor)
            self.view_original.setCursor(Qt.OpenHandCursor)
        elif mode == 'pipette':
            self.view_result._click_mode = True
            self.view_result.setDragMode(QGraphicsView.NoDrag)
            self.view_result.setCursor(Qt.CrossCursor)
            self.view_original.setDragMode(QGraphicsView.NoDrag)
        else:
            self.view_result._click_mode = True
            self.view_result.setDragMode(QGraphicsView.NoDrag)
            self.view_result.setCursor(Qt.CrossCursor)
            self.view_original.setDragMode(QGraphicsView.NoDrag)
            self.view_result.clear_overlays()

    def activate_line_profile(self):
        if not self._check_loaded():
            return
        self._set_canvas_mode('line_profile')
        self.analysis_panel.setCurrentIndex(1)

    def activate_distance(self):
        if not self._check_loaded():
            return
        self._set_canvas_mode('distance')
        self.analysis_panel.setCurrentIndex(2)

    def _on_canvas_click(self, x, y):
        if self.interaction_mode is None or self.interaction_mode == 'pan':
            return

        if self.interaction_mode == 'pipette':
            # Just update coord display (already done via coord_changed)
            self._on_coord_changed(x, y)
            return

        self.click_points.append((x, y))
        self.view_result.add_point_overlay(x, y)

        if len(self.click_points) == 2:
            x0, y0 = self.click_points[0]
            x1, y1 = self.click_points[1]

            if self.interaction_mode == 'line_profile':
                self.view_result.add_line_overlay(x0, y0, x1, y1, dashed=False)
                points = ImageProcessor.bresenham_line(x0, y0, x1, y1)
                self.analysis_panel.profile_widget.plot_profile(self.result_image, points)
                self.analysis_panel.update_profile_info(x0, y0, x1, y1, len(points), self.result_image)
                self.analysis_panel.setCurrentIndex(1)

            elif self.interaction_mode == 'distance':
                self.view_result.add_line_overlay(x0, y0, x1, y1, dashed=True)
                self.analysis_panel.update_distance(x0, y0, x1, y1, self.result_image)
                self.analysis_panel.setCurrentIndex(2)
                dist = math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
                self.coord_label.setText(f'Distance: {dist:.1f} pixels')

            self._set_canvas_mode('pan')

    # ══════════════════════════════════════════════════════════════════════
    #  APPLY OPERATION (with threading)
    # ══════════════════════════════════════════════════════════════════════

    def _apply_threaded(self, func, op_name, **kwargs):
        if not self._check_loaded() or self._processing:
            return
        self._processing = True

        # UI feedback
        self.progress_bar.setValue(10)
        self.progress_bar.show()
        self.status_state.setText('Traitement en cours…')
        if hasattr(self, '_btn_apply'):
            self._btn_apply.setEnabled(False)
            self._btn_apply.setText('  Traitement…')

        # Restore base if previewing
        img_to_process = self.preview_base.copy() if self.preview_base is not None else self.result_image.copy()

        self._thread = QThread()
        self._worker = ProcessingWorker(func, img_to_process, op_name, kwargs)
        self._worker.moveToThread(self._thread)
        self._thread.started.connect(self._worker.run)
        self._worker.finished.connect(self._on_processing_done)
        self._worker.error.connect(self._on_processing_error)
        self._worker.progress.connect(self.progress_bar.setValue)
        self._worker.finished.connect(self._thread.quit)
        self._worker.error.connect(self._thread.quit)
        self._thread.start()

    def _on_processing_done(self, result, op_name):
        self._processing = False
        self.progress_bar.hide()

        if isinstance(result, tuple):
            self.result_image = result[0]
            # Store extra info (like Otsu threshold)
            if hasattr(self, '_otsu_info_label') and len(result) > 1:
                self._otsu_info_label.setText(f'Seuil calculé : {result[1]}')
                self._otsu_info_label.setStyleSheet('color: #4CA3FF; font-size: 12px;')
        else:
            self.result_image = result

        self.history.push(op_name, self.result_image)
        self.history_panel.add_entry(op_name)
        self.preview_base = self.result_image.copy()
        self._refresh_result_display()
        self._update_status(f'Opération appliquée : {op_name}')

        if hasattr(self, '_btn_apply'):
            self._btn_apply.setEnabled(True)
            self._btn_apply.setText('  Confirmer' if self.live_preview else '  Appliquer')

    def _on_processing_error(self, error_msg):
        self._processing = False
        self.progress_bar.hide()
        QMessageBox.critical(self, 'Erreur', f'Erreur de traitement:\n{error_msg}')
        self._update_status('Erreur')
        if hasattr(self, '_btn_apply'):
            self._btn_apply.setEnabled(True)
            self._btn_apply.setText('  Confirmer' if self.live_preview else '  Appliquer')

    # Legacy apply (for simple/fast operations)
    def _apply(self, func, op_name, **kwargs):
        if not self._check_loaded():
            return
        try:
            t0 = time.perf_counter()
            result = func(self.result_image, **kwargs)
            self.last_proc_time = (time.perf_counter() - t0) * 1000
            self.result_image = result[0] if isinstance(result, tuple) else result
            self.history.push(op_name, self.result_image)
            self.history_panel.add_entry(op_name)
            self._refresh_result_display()
            self._update_status(f'Opération appliquée : {op_name}')
        except Exception as e:
            QMessageBox.critical(self, 'Erreur', f'Erreur: {op_name}\n{e}')

    # ══════════════════════════════════════════════════════════════════════
    #  TOOL PARAMETER PANELS
    # ══════════════════════════════════════════════════════════════════════

    def _tool_contrast(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Luminosité / Contraste')
        self.sl_alpha = self._add_slider('Contraste (α)', 0.1, 3.0, 1.0, step=0.05, decimals=2)
        self.sl_beta = self._add_slider('Luminosité (β)', -100, 100, 0, step=1)
        self._add_preview_checkbox()
        self._prepare_preview(
            ImageProcessor.adjust_contrast_brightness,
            lambda: {'alpha': self.sl_alpha.value() * 0.05,
                     'beta': self.sl_beta.value()})
        self._add_buttons(self._apply_contrast)

    def _apply_contrast(self):
        alpha = self.sl_alpha.value() * 0.05
        beta = self.sl_beta.value()
        if self.preview_base is not None:
            self.result_image = self.preview_base.copy()
        self._apply_threaded(ImageProcessor.adjust_contrast_brightness,
                             f'Contraste (α={alpha:.2f}, β={beta})', alpha=alpha, beta=beta)

    def _tool_histeq(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Égalisation d\'histogramme')
        self._add_info_text('Aucun paramètre requis', italic=True)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(lambda: self._apply_threaded(
            ImageProcessor.histogram_equalization, 'Égalisation d\'histogramme'))

    def _tool_otsu(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Seuillage (Otsu)')
        self._otsu_info_label = QLabel('Seuil calculé : —')
        self._otsu_info_label.setStyleSheet('color: #ABABAB; font-size: 12px;')
        self.param_container_layout.addWidget(self._otsu_info_label)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(self._apply_otsu)

    def _apply_otsu(self):
        if not self._check_loaded():
            return
        self._apply_threaded(ImageProcessor.otsu_threshold, 'Seuillage (Otsu)')

    def _tool_box(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Moyenneur')
        self.combo_box_k = self._add_combo('Taille du noyau', ['3 × 3', '5 × 5', '7 × 7'], 0)
        self._add_preview_checkbox()
        self._prepare_preview(
            ImageProcessor.box_filter,
            lambda: {'k': [3, 5, 7][self.combo_box_k.currentIndex()]})
        self._add_buttons(lambda: self._apply_filter(
            ImageProcessor.box_filter, 'Moyenneur',
            k=[3, 5, 7][self.combo_box_k.currentIndex()]))

    def _tool_median(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Médian')
        self.combo_med_k = self._add_combo('Taille du noyau', ['3 × 3', '5 × 5', '7 × 7'], 0)
        self._add_preview_checkbox()
        self._prepare_preview(
            ImageProcessor.median_filter,
            lambda: {'k': [3, 5, 7][self.combo_med_k.currentIndex()]})
        self._add_buttons(lambda: self._apply_filter(
            ImageProcessor.median_filter, 'Médian',
            k=[3, 5, 7][self.combo_med_k.currentIndex()]))

    def _tool_gaussian(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Gaussian Blur')
        self.combo_gauss_k = self._add_combo('Taille du noyau', ['3 × 3', '5 × 5', '7 × 7'], 1)
        self.sl_sigma = self._add_slider('Sigma', 0.1, 5.0, 1.2, step=0.1, decimals=1)
        self.combo_border = self._add_combo('Type de bordure', ['Symétrique', 'Réfléchi', 'Constant (0)'], 0)
        self._add_preview_checkbox()
        self._prepare_preview(
            ImageProcessor.gaussian_filter,
            lambda: {'k': [3, 5, 7][self.combo_gauss_k.currentIndex()],
                     'sigma': self.sl_sigma.value() * 0.1})
        self._add_buttons(self._apply_gaussian)

    def _apply_gaussian(self):
        k = [3, 5, 7][self.combo_gauss_k.currentIndex()]
        sigma = self.sl_sigma.value() * 0.1
        if self.preview_base is not None:
            self.result_image = self.preview_base.copy()
        self._apply_threaded(ImageProcessor.gaussian_filter,
                             f'Gaussian Blur ({k}×{k}, σ={sigma:.1f})', k=k, sigma=sigma)

    def _tool_sobel(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Sobel')
        # Radio buttons for mode
        self.sobel_mode = QButtonGroup(self)
        for i, (text, val) in enumerate([('Magnitude', 'magnitude'), ('Axe X (Gx)', 'gx'), ('Axe Y (Gy)', 'gy')]):
            rb = QRadioButton(text)
            rb._value = val
            self.sobel_mode.addButton(rb, i)
            self.param_container_layout.addWidget(rb)
            if i == 0:
                rb.setChecked(True)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(lambda: self._apply_threaded(
            ImageProcessor.sobel, f'Sobel ({self.sobel_mode.checkedButton()._value})',
            mode=self.sobel_mode.checkedButton()._value))

    def _tool_prewitt(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Prewitt')
        self.prewitt_mode = QButtonGroup(self)
        for i, (text, val) in enumerate([('Magnitude', 'magnitude'), ('Axe X (Gx)', 'gx'), ('Axe Y (Gy)', 'gy')]):
            rb = QRadioButton(text)
            rb._value = val
            self.prewitt_mode.addButton(rb, i)
            self.param_container_layout.addWidget(rb)
            if i == 0:
                rb.setChecked(True)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(lambda: self._apply_threaded(
            ImageProcessor.prewitt, f'Prewitt ({self.prewitt_mode.checkedButton()._value})',
            mode=self.prewitt_mode.checkedButton()._value))

    def _tool_laplacian(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Laplacien')
        self.lapl_8 = QCheckBox('  Noyau 8-connexe')
        self.param_container_layout.addWidget(self.lapl_8)
        self.lapl_enhance = QCheckBox('  Accentuation (ajouter à l\'original)')
        self.lapl_enhance.setChecked(True)
        self.param_container_layout.addWidget(self.lapl_enhance)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(lambda: self._apply_threaded(
            ImageProcessor.laplacian,
            f'Laplacien ({"8" if self.lapl_8.isChecked() else "4"}-connexe)',
            connected=8 if self.lapl_8.isChecked() else 4))

    def _tool_unsharp(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Netteté (Unsharp Mask)')
        self.sl_unsharp_a = self._add_slider('Intensité', 0.5, 3.0, 1.5, step=0.1, decimals=1)
        self.sl_unsharp_s = self._add_slider('Sigma flou', 0.5, 2.0, 1.0, step=0.1, decimals=1)
        self._add_preview_checkbox()
        self._prepare_preview(
            ImageProcessor.unsharp_mask,
            lambda: {'amount': self.sl_unsharp_a.value() * 0.1,
                     'sigma': self.sl_unsharp_s.value() * 0.1})
        self._add_buttons(self._apply_unsharp)

    def _apply_unsharp(self):
        amount = self.sl_unsharp_a.value() * 0.1
        sigma = self.sl_unsharp_s.value() * 0.1
        if self.preview_base is not None:
            self.result_image = self.preview_base.copy()
        self._apply_threaded(ImageProcessor.unsharp_mask,
                             f'Unsharp (α={amount:.1f}, σ={sigma:.1f})', amount=amount, sigma=sigma)

    def _apply_filter(self, func, name, **kwargs):
        if self.preview_base is not None:
            self.result_image = self.preview_base.copy()
        k = kwargs.get('k', 3)
        self._apply_threaded(func, f'{name} ({k}×{k})', **kwargs)

    # ── Morphology ──

    def _morph_panel(self, title, callback):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title(title)
        self.morph_shape = self._add_combo('Forme', ['Carré', 'Croix'], 0)
        self.morph_size = self._add_combo('Taille', ['3 × 3', '5 × 5'], 0)
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(callback)

    def _get_morph_params(self):
        shape = 'square' if self.morph_shape.currentIndex() == 0 else 'cross'
        size = [3, 5][self.morph_size.currentIndex()]
        se = ImageProcessor.get_structuring_element(shape, size)
        return se, shape, size

    def _binarize_current(self):
        gray = ImageProcessor.to_grayscale(self.result_image)
        _, t = ImageProcessor.otsu_threshold(gray)
        return np.where(gray > t, 255, 0).astype(np.uint8)

    def _tool_erode(self):
        self._morph_panel('Érosion', self._apply_erode)

    def _apply_erode(self):
        se, shape, size = self._get_morph_params()
        binary = self._binarize_current()
        self.result_image = ImageProcessor.erode(binary, se)
        self.history.push(f'Érosion ({shape} {size}×{size})', self.result_image)
        self.history_panel.add_entry(f'Érosion ({shape} {size}×{size})')
        self._refresh_result_display()
        self._update_status(f'Érosion ({shape} {size}×{size})')

    def _tool_dilate(self):
        self._morph_panel('Dilatation', self._apply_dilate)

    def _apply_dilate(self):
        se, shape, size = self._get_morph_params()
        binary = self._binarize_current()
        self.result_image = ImageProcessor.dilate(binary, se)
        self.history.push(f'Dilatation ({shape} {size}×{size})', self.result_image)
        self.history_panel.add_entry(f'Dilatation ({shape} {size}×{size})')
        self._refresh_result_display()
        self._update_status(f'Dilatation ({shape} {size}×{size})')

    def _tool_opening(self):
        self._morph_panel('Ouverture', self._apply_opening)

    def _apply_opening(self):
        se, shape, size = self._get_morph_params()
        binary = self._binarize_current()
        self.result_image = ImageProcessor.opening(binary, se)
        self.history.push(f'Ouverture ({shape} {size}×{size})', self.result_image)
        self.history_panel.add_entry(f'Ouverture ({shape} {size}×{size})')
        self._refresh_result_display()
        self._update_status(f'Ouverture ({shape} {size}×{size})')

    def _tool_closing(self):
        self._morph_panel('Fermeture', self._apply_closing)

    def _apply_closing(self):
        se, shape, size = self._get_morph_params()
        binary = self._binarize_current()
        self.result_image = ImageProcessor.closing(binary, se)
        self.history.push(f'Fermeture ({shape} {size}×{size})', self.result_image)
        self.history_panel.add_entry(f'Fermeture ({shape} {size}×{size})')
        self._refresh_result_display()
        self._update_status(f'Fermeture ({shape} {size}×{size})')

    def _tool_skeleton(self):
        if not self._check_loaded():
            return
        self._clear_params()
        self._add_title('Squelette (Zhang-Suen)')
        self._add_info_text('Algorithme de Zhang-Suen\nAmincissement itératif')
        self._add_preview_checkbox()
        self._prepare_preview(None, None)
        self._add_buttons(self._apply_skeleton)

    def _apply_skeleton(self):
        self._apply_threaded(ImageProcessor.zhang_suen_skeleton, 'Squelette (Zhang-Suen)')

    # ── About ──

    def _show_about(self):
        QMessageBox.about(self, 'À propos',
                          'Custom-IPT — Image Processing Toolbox\n\n'
                          'Application professionnelle de traitement d\'images.\n'
                          'Tous les algorithmes sont implémentés from scratch avec NumPy.\n\n'
                          'PySide6 + Matplotlib + NumPy + Pillow')


# ══════════════════════════════════════════════════════════════════════════════
#  DARK STYLESHEET — Adobe CC Standard
# ══════════════════════════════════════════════════════════════════════════════

DARK_STYLESHEET = """
/* ── Global ── */
QMainWindow, QWidget#centralWidget {
    background-color: #1C1C1C;
}
QWidget {
    background-color: #1C1C1C;
    color: #E8E8E8;
    font-family: "Segoe UI", "SF Pro Display", "Ubuntu", sans-serif;
    font-size: 11px;
}

/* ── Menu Bar ── */
QMenuBar {
    background-color: #1C1C1C;
    color: #E8E8E8;
    font-size: 13px;
    border-bottom: 1px solid #3A3A3A;
    padding: 2px 4px;
}
QMenuBar::item {
    padding: 4px 10px;
}
QMenuBar::item:selected {
    background-color: #2D2D2D;
}
QMenu {
    background-color: #252525;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
    padding: 4px;
}
QMenu::item {
    padding: 5px 24px;
}
QMenu::item:selected {
    background-color: #1473E6;
}
QMenu::separator {
    height: 1px;
    background: #3A3A3A;
    margin: 4px 8px;
}

/* ── Toolbar ── */
QToolBar {
    background-color: #2D2D2D;
    border-bottom: 1px solid #3A3A3A;
    spacing: 4px;
    padding: 8px 12px;
}
QToolBar::separator {
    width: 1px;
    background: #3A3A3A;
    margin: 4px 6px;
}
QToolButton {
    background: transparent;
    color: #ABABAB;
    border: none;
    padding: 4px 10px;
    font-size: 12px;
    height: 36px;
    min-width: 36px;
}
QToolButton:hover {
    background-color: #383838;
    color: #E8E8E8;
}
QToolButton:pressed {
    background-color: #404040;
}

/* ── Status Bar ── */
QStatusBar {
    background-color: #1C1C1C;
    color: #777777;
    font-size: 11px;
    border-top: 1px solid #3A3A3A;
}

/* ── Scroll Area ── */
QScrollArea {
    background: transparent;
    border: none;
}
QScrollBar:vertical {
    background-color: #252525;
    width: 6px;
    border: none;
}
QScrollBar::handle:vertical {
    background-color: #3A3A3A;
    border-radius: 3px;
    min-height: 20px;
}
QScrollBar::handle:vertical:hover {
    background-color: #555555;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0;
}
QScrollBar:horizontal {
    background-color: #252525;
    height: 6px;
    border: none;
}
QScrollBar::handle:horizontal {
    background-color: #3A3A3A;
    border-radius: 3px;
    min-width: 20px;
}
QScrollBar::handle:horizontal:hover {
    background-color: #555555;
}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0;
}

/* ── Splitter ── */
QSplitter::handle {
    background: #3A3A3A;
}
QSplitter::handle:horizontal {
    width: 1px;
}
QSplitter::handle:vertical {
    height: 1px;
}

/* ── Slider ── */
QSlider::groove:horizontal {
    height: 4px;
    background-color: #3A3A3A;
    border-radius: 2px;
}
QSlider::sub-page:horizontal {
    background-color: #1473E6;
    border-radius: 2px;
}
QSlider::handle:horizontal {
    width: 14px;
    height: 14px;
    margin: -5px 0;
    border-radius: 7px;
    background-color: #1473E6;
}
QSlider::handle:horizontal:hover {
    width: 16px;
    height: 16px;
    margin: -6px 0;
    border-radius: 8px;
    background-color: #1A82FF;
}

/* ── Combo Box ── */
QComboBox {
    background-color: #333333;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
    height: 28px;
    padding-left: 8px;
    font-size: 12px;
}
QComboBox::drop-down {
    border: none;
    width: 20px;
}
QComboBox QAbstractItemView {
    background-color: #252525;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
    selection-background-color: #1473E6;
}

/* ── Buttons ── */
QPushButton {
    background-color: transparent;
    color: #ABABAB;
    border: none;
    font-size: 12px;
}
QPushButton:hover {
    background-color: #383838;
    color: #E8E8E8;
}
QPushButton#btnAppliquer {
    background-color: #1473E6;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: bold;
    border: none;
}
QPushButton#btnAppliquer:hover {
    background-color: #1A82FF;
}
QPushButton#btnAppliquer:pressed {
    background-color: #0E5EC4;
}
QPushButton#btnAppliquer:disabled {
    background-color: #333333;
    color: #606060;
}
QPushButton#btnReinitialiser {
    background-color: transparent;
    color: #ABABAB;
    border: 1px solid #3A3A3A;
    font-size: 12px;
}
QPushButton#btnReinitialiser:hover {
    background-color: #2D2D2D;
    color: #E8E8E8;
}

/* ── Check / Radio ── */
QCheckBox {
    color: #ABABAB;
    font-size: 12px;
    spacing: 6px;
}
QCheckBox::indicator {
    width: 14px;
    height: 14px;
    border: 1px solid #606060;
    background-color: transparent;
}
QCheckBox::indicator:checked {
    background-color: #1473E6;
    border-color: #1473E6;
}
QRadioButton {
    color: #ABABAB;
    font-size: 12px;
    spacing: 6px;
}
QRadioButton::indicator {
    width: 14px;
    height: 14px;
    border: 1px solid #606060;
    border-radius: 7px;
    background-color: transparent;
}
QRadioButton::indicator:checked {
    background-color: #1473E6;
    border-color: #1473E6;
}

/* ── Group Box ── */
QGroupBox {
    color: #E8E8E8;
    border: 1px solid #3A3A3A;
    margin-top: 8px;
    padding-top: 16px;
    font-size: 11px;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 8px;
    padding: 0 4px;
}

/* ── Progress Bar ── */
QProgressBar {
    background: #1C1C1C;
    border: none;
    height: 3px;
}
QProgressBar::chunk {
    background: #1473E6;
}

/* ── Message Box ── */
QMessageBox {
    background: #252525;
}
QMessageBox QLabel {
    color: #E8E8E8;
}

/* ── Tooltips ── */
QToolTip {
    background: #2D2D2D;
    color: #E8E8E8;
    border: 1px solid #3A3A3A;
    padding: 4px;
    font-size: 11px;
}

/* ── Frame separators ── */
QFrame[frameShape="5"] {
    color: #3A3A3A;
    max-width: 1px;
}
"""


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    app.setStyleSheet(DARK_STYLESHEET)
    app.setFont(QFont('Segoe UI', 10))

    window = CustomIPT()
    window.show()
    sys.exit(app.exec())
