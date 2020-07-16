import React, { useState } from 'react';
import { ColumnProps } from 'antd/lib/table';
import { UploadOutlined } from '@ant-design/icons';
import { UploadProps } from 'antd/lib/upload';
import { Upload, message, Button, Table } from 'antd';
import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import './App.css';

type Problem = {
  id: number;
  type: "FILL" | "SELECT";
  createdAt: string;
  title: string;
  options: Option[];
  answer: string;
  hint: string;
} & {
  key: number;
};

type Option = {
  value: string;
  text: string;
};

const findSplitPoints = (tokens: Token[]) => {
  const res: number[] = [];
  tokens.forEach((t, index) => {
    if (t.type === "heading_open" && t.tag === "h3") {
      res.push(index);
    }
  })
  console.log('splitPoints: ', res);
  return res;
}

const parseProblem = (tokens: Token[]) => {
  const problem: Problem = {
    id: 0,
    key: 0,
    type: "FILL",
    createdAt: new Date().toISOString(),
    title: "",
    options: [],
    answer: "",
    hint: "",
  };

  tokens.forEach((t, index) => {
    if (t.type === 'heading_close' && t.tag === 'h3') {
      problem.title = tokens[index - 1].content;
      problem.answer = tokens[index + 2].content;
    }

    if (t.type === 'list_item_open' && t.tag === 'li') {
      problem.options.push({
        value: (problem.options.length + 1).toString(),
        text: tokens[index + 2].content,
      });
    }

    if (t.type === 'inline' && t.content === '解答') {
      problem.hint = tokens[index + 3].content;
    }
  })

  if (problem.options.length) {
    problem.type = 'SELECT';
  }
  return problem;
}

const extractProblemsFromMd = (content: string) => {
  const md = new MarkdownIt();
  const tokens = md.parse(content, {});
  const splitPoints = findSplitPoints(tokens);

  const problems = splitPoints.map((startPoint, index) => {
    let problemTokens;
    if (index + 1 === splitPoints.length) {
      // 从这点开始都是最后一题
      problemTokens = tokens.slice(startPoint);
    } else {
      const endPoint = splitPoints[index + 1];
      problemTokens = tokens.slice(startPoint, endPoint);
    }
    console.log(problemTokens);

    const problem = parseProblem(problemTokens);
    problem.id = startPoint + 1;
    problem.key = startPoint;
    console.log(problem);
    return problem;
  })

  return problems;
}

const ProblemType = {
  'FILL': '填空',
  'SELECT': '选择',
};

const columns: ColumnProps<Problem>[] = [
  {
    title: 'ID',
    key: 'id',
    dataIndex: 'id',
  },
  {
    title: '题目类型',
    key: 'type',
    dataIndex: 'type',
    render: (value) => <>{ProblemType[value as 'FILL' | 'SELECT']}</>
  },
  {
    title: '创建时间',
    key: 'createdAt',
    dataIndex: 'createdAt',
    render: (value) => <>{new Date(value).toLocaleString()}</>
  },
  {
    title: '标题',
    key: 'title',
    dataIndex: 'title',
  },
  {
    title: '选项',
    key: 'options',
    dataIndex: 'options',
    render: (_, record) => (
      <>
        {record.options.map(o => (
          <div key={o.value}>{o.value}. {o.text}</div>
        ))}
      </>
    ),
  },
  {
    title: '答案',
    key: 'answer',
    dataIndex: 'answer',
  },
  {
    title: '解答',
    key: 'hint',
    dataIndex: 'hint',
    width: 400,
  },
];

function App() {
  const [processing, setProcessing] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);

  const uploadProps: UploadProps = {
    accept: '.md',
    name: 'file',
    showUploadList: false,
    headers: {
      authorization: 'authorization-text',
    },
    customRequest: (options) => {
      setProcessing(true);
      console.log(options.file);
      const read = new FileReader();

      read.readAsText(options.file, 'utf8');

      read.onloadend = () => {
        const newProblems = extractProblemsFromMd(read.result as string);
        if (!newProblems.length) {
          message.info('未检测到题目')
          setProcessing(false);
          return;
        }
        message.success(`${options.file.name} 导入成功`);
        setProblems(newProblems);
        setProcessing(false);
      }
      read.onerror = () => {
        message.error(`${options.file.name} 导入失败`);
        setProcessing(false);
      }
    },
  };

  return (
    <div style={{ padding: 16 }}>
      <Upload {...uploadProps}>
        <Button
          style={{ marginBottom: 16 }}
          loading={processing}
          disabled={processing}
        >
          <UploadOutlined /> 导入题目
        </Button>
      </Upload>
      <Table<Problem> columns={columns} dataSource={problems} pagination={false} />
    </div>
  );
}

export default App;
