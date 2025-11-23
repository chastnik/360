// Автор: Стас Чашин @chastnik
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Certificate {
  id: number;
  name: string;
  file_name: string;
  file_size: number;
  file_mime: string;
  competence_matrix_id?: number;
  test_result_id?: number;
  created_at: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string;
  competency_name?: string;
  competency_id?: number;
}

interface Competency {
  id: number;
  name: string;
  description?: string;
}

const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фильтры поиска
  const [searchText, setSearchText] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState<string>('');
  const [userNameSearch, setUserNameSearch] = useState('');

  // Загрузка компетенций при монтировании
  useEffect(() => {
    const loadCompetencies = async () => {
      try {
        const response = await api.get('/learning/competencies');
        setCompetencies(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Ошибка загрузки компетенций:', err);
      }
    };
    loadCompetencies();
  }, []);

  // Поиск сертификатов
  const searchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }
      if (selectedCompetency) {
        params.append('competency_id', selectedCompetency);
      }
      if (userNameSearch.trim()) {
        params.append('user_name', userNameSearch.trim());
      }

      const response = await api.get(`/learning/certificates/search?${params.toString()}`);
      setCertificates(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Ошибка поиска сертификатов:', err);
      setError(err.response?.data?.error || 'Не удалось выполнить поиск сертификатов');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedCompetency, userNameSearch]);

  // Автопоиск при изменении фильтров (с задержкой)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText.trim() || selectedCompetency || userNameSearch.trim()) {
        searchCertificates();
      } else {
        setCertificates([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText, selectedCompetency, userNameSearch, searchCertificates]);

  // Обработчик загрузки файла сертификата
  const handleDownloadCertificate = async (certificate: Certificate) => {
    try {
      const response = await api.get(`/learning/certificates/${certificate.id}/file`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || certificate.file_mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = certificate.file_name || certificate.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка загрузки сертификата:', error);
      alert('Не удалось загрузить сертификат. Проверьте подключение к серверу.');
    }
  };

  // Форматирование размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  // Форматирование даты
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Поиск сертификатов</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Найдите сертификаты сотрудников по компетенциям, ФИО или тексту
          </p>
        </div>
      </div>

      {/* Фильтры поиска */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поиск по тексту */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Поиск по тексту
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Название сертификата или файла..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Поиск по компетенции */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Компетенция
            </label>
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Все компетенции</option>
              {competencies.map((comp) => (
                <option key={comp.id} value={String(comp.id)}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Поиск по ФИО */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ФИО сотрудника
            </label>
            <input
              type="text"
              value={userNameSearch}
              onChange={(e) => setUserNameSearch(e.target.value)}
              placeholder="Имя или фамилия..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Сообщения об ошибках */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Результаты поиска */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Поиск сертификатов...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchText.trim() || selectedCompetency || userNameSearch.trim() ? (
              'Сертификаты не найдены'
            ) : (
              'Введите критерии поиска для отображения сертификатов'
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Сертификат
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Сотрудник
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Компетенция
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Размер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Дата загрузки
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {cert.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {cert.file_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/profile/${cert.user_id}`}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {cert.first_name} {cert.last_name}
                      </Link>
                      {cert.position && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {cert.position}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {cert.competency_name || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(cert.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(cert.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDownloadCertificate(cert)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                      >
                        Скачать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificatesPage;

