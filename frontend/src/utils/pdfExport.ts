import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Экспорт HTML-элемента в PDF
 * @param elementId ID элемента для экспорта
 * @param filename Имя файла для сохранения
 * @param title Заголовок отчета
 */
export const exportToPDF = async (
  elementId: string,
  filename: string = 'report.pdf',
  title?: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Элемент с ID "${elementId}" не найден`);
    return;
  }

  try {
    // Скрываем элементы, которые не должны быть в PDF
    const elementsToHide = document.querySelectorAll('[data-no-export="true"]');
    elementsToHide.forEach((el: any) => {
      el.style.display = 'none';
    });

    // Создаем временный контейнер для экспорта с заголовком
    let exportContainer: HTMLElement | null = null;
    
    if (title) {
      // Создаем временный контейнер с заголовком
      exportContainer = document.createElement('div');
      exportContainer.style.position = 'absolute';
      exportContainer.style.left = '-9999px';
      exportContainer.style.top = '0';
      exportContainer.style.width = `${element.offsetWidth}px`;
      exportContainer.style.backgroundColor = '#ffffff';
      exportContainer.style.padding = '20px';
      exportContainer.style.boxSizing = 'border-box';
      
      // Добавляем заголовок
      const titleElement = document.createElement('h1');
      titleElement.textContent = title;
      titleElement.style.fontSize = '24px';
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.margin = '0 0 20px 0';
      titleElement.style.padding = '0';
      titleElement.style.color = '#000000';
      titleElement.style.fontFamily = 'Arial, sans-serif';
      exportContainer.appendChild(titleElement);
      
      // Клонируем элемент с содержимым (deep clone для сохранения всех стилей)
      const clonedElement = element.cloneNode(true) as HTMLElement;
      // Удаляем атрибуты, которые не нужны в клоне
      clonedElement.removeAttribute('data-no-export');
      clonedElement.removeAttribute('data-no-print');
      clonedElement.style.margin = '0';
      clonedElement.style.padding = '0';
      exportContainer.appendChild(clonedElement);
      
      // Добавляем в DOM
      document.body.appendChild(exportContainer);
    }

    // Используем контейнер с заголовком или оригинальный элемент
    const elementToExport = exportContainer || element;

    // Создаем canvas из HTML
    const canvas = await html2canvas(elementToExport, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: elementToExport.scrollWidth,
      windowHeight: elementToExport.scrollHeight,
      allowTaint: true,
      removeContainer: false,
    });

    // Удаляем временный контейнер, если создавали
    if (exportContainer) {
      document.body.removeChild(exportContainer);
    }

    // Восстанавливаем скрытые элементы
    elementsToHide.forEach((el: any) => {
      el.style.display = '';
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Размеры A4 в мм
    const a4Width = 210; // ширина A4
    const a4Height = 297; // высота A4
    const margin = 5; // отступы по 5 мм с каждой стороны
    const contentWidth = a4Width - (margin * 2); // ширина контента
    const contentHeight = a4Height - (margin * 2); // высота контента
    
    // Рассчитываем размеры изображения с учетом отступов
    const imgWidth = contentWidth; // ширина изображения в мм
    const imgHeight = (canvas.height * contentWidth) / canvas.width; // высота изображения в мм
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Разбиваем изображение на страницы
    let currentY = margin; // текущая позиция Y на странице
    let sourceY = 0; // текущая позиция Y в исходном изображении
    let remainingHeight = imgHeight; // оставшаяся высота для размещения
    const sourceHeight = canvas.height; // высота исходного изображения в пикселях
    
    while (remainingHeight > 0) {
      // Высота части изображения для текущей страницы
      const pagePartHeight = Math.min(remainingHeight, contentHeight);
      
      // Высота в пикселях для текущей части
      const pagePartHeightPx = (pagePartHeight / imgHeight) * sourceHeight;
      
      // Создаем временный canvas для части страницы
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.ceil(pagePartHeightPx);
      const pageCtx = pageCanvas.getContext('2d');
      
      if (pageCtx) {
        // Копируем часть исходного изображения
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, pagePartHeightPx, // источник
          0, 0, canvas.width, pagePartHeightPx // назначение
        );
        
        // Конвертируем в изображение
        const pageImgData = pageCanvas.toDataURL('image/png');
        
        // Добавляем изображение на страницу
        pdf.addImage(pageImgData, 'PNG', margin, currentY, imgWidth, pagePartHeight);
        
        // Обновляем позиции
        sourceY += pagePartHeightPx;
        remainingHeight -= pagePartHeight;
        
        // Если осталось место, добавляем новую страницу
        if (remainingHeight > 0) {
          pdf.addPage();
          currentY = margin;
        }
      }
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Ошибка экспорта в PDF:', error);
    alert('Не удалось экспортировать отчет в PDF');
  }
};

/**
 * Печать HTML-элемента
 * @param elementId ID элемента для печати
 */
export const printReport = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Элемент с ID "${elementId}" не найден`);
    return;
  }

  // Скрываем элементы, которые не должны быть в печати
  const elementsToHide = document.querySelectorAll('[data-no-print="true"]');
  elementsToHide.forEach((el: any) => {
    el.style.display = 'none';
  });

  // Создаем новое окно для печати
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Не удалось открыть окно для печати. Разрешите всплывающие окна.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Печать отчета</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 1cm;
            }
          }
          * {
            box-sizing: border-box;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Ждем загрузки и печатаем
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    // Восстанавливаем скрытые элементы
    elementsToHide.forEach((el: any) => {
      el.style.display = '';
    });
  }, 250);
};

